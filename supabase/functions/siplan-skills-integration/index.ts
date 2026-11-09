import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ELIGIBLE_SYSTEMS = new Set(["Orion TN", "Orion PRO", "Orion REG"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body?.action ?? "provision";
    const projectId = body?.projectId;

    const requiredAction =
      action === "get_status" || action === "get_batch_activity" ? "view" : "edit";

    // Enforcement RBAC obrigatório via has_permission('projects', requiredAction)
    const { data: allowed, error: permError } = await supabaseAdmin.rpc("has_permission", {
      user_id: caller.id,
      req_resource: "projects",
      req_action: requiredAction,
    });

    if (permError || !allowed) {
      return new Response(
        JSON.stringify({ error: "Você não possui permissão para realizar esta ação em projetos." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Busca segredo e URL da bridge do Siplan Skills
    const { data: secretsRows, error: secretsError } = await supabaseAdmin
      .from("internal_integration_secrets")
      .select("key_name, secret_value")
      .in("key_name", ["skills_bridge_url", "skills_bridge_secret"]);

    if (secretsError || !secretsRows || secretsRows.length < 2) {
      throw new Error("Configuração de integração com Siplan Skills não encontrada no banco.");
    }

    const secretsMap = Object.fromEntries(secretsRows.map((r) => [r.key_name, r.secret_value]));
    const bridgeUrl = secretsMap["skills_bridge_url"];
    const bridgeSecret = secretsMap["skills_bridge_secret"];

    if (action === "get_batch_activity") {
      const bridgeResp = await fetch(bridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-siplan-hub-secret": bridgeSecret,
        },
        body: JSON.stringify({
          action: "get_batch_activity",
        }),
      });

      const bridgeJson = await bridgeResp.json();
      if (!bridgeResp.ok || bridgeJson?.error) {
        return new Response(
          JSON.stringify({ error: bridgeJson?.error || "Erro ao consultar atividades no Siplan Skills." }),
          {
            status: bridgeResp.status || 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ activityMap: bridgeJson.data || {} }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nome do colaborador para auditoria
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", caller.id)
      .maybeSingle();

    const actorName = profileData?.full_name || caller.email || "Colaborador HUB";

    // Busca grupo de projetos irmãos do mesmo cartório
    const { data: groupData, error: groupError } = await supabaseAdmin.rpc(
      "get_project_skills_sibling_group",
      { p_project_id: projectId }
    );

    if (groupError || !groupData) {
      return new Response(
        JSON.stringify({ error: groupError?.message || "Falha ao localizar grupo de projetos do cartório." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const targetProject = groupData.target_project;
    if (!targetProject || !ELIGIBLE_SYSTEMS.has(targetProject.system_type)) {
      return new Response(
        JSON.stringify({
          error: "A integração com o Siplan Skills é exclusiva para projetos Orion TN, Orion PRO ou Orion REG.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const siblingProjects: Array<{
      id: string;
      client_name: string;
      system_type: string;
      ticket_number: string;
      custom_fields: Record<string, unknown>;
    }> = Array.isArray(groupData.sibling_projects) ? groupData.sibling_projects : [targetProject];

    const siblingIds = siblingProjects.map((p) => p.id);
    const orionSystems: string[] = Array.isArray(groupData.orion_systems)
      ? groupData.orion_systems
      : [targetProject.system_type];

    const existingCartorioId: string | null = groupData.existing_cartorio_id || null;

    if (action === "provision") {
      const suggestedUsername = (body?.suggestedUsername ?? "").trim();
      const candidateUsernames = Array.isArray(body?.candidateUsernames) ? body.candidateUsernames : [];
      const cartorioNome = (body?.cartorioNome || targetProject.client_name || "").trim();

      if (!suggestedUsername) {
        return new Response(JSON.stringify({ error: "suggestedUsername é obrigatório." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bridgeResp = await fetch(bridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-siplan-hub-secret": bridgeSecret,
        },
        body: JSON.stringify({
          action: "provision",
          cartorioNome,
          suggestedUsername,
          candidateUsernames,
          orionSystems,
          existingCartorioId,
        }),
      });

      const bridgeJson = await bridgeResp.json();
      if (!bridgeResp.ok || bridgeJson?.error) {
        return new Response(
          JSON.stringify({ error: bridgeJson?.error || "Erro ao provisionar cartório no Siplan Skills." }),
          {
            status: bridgeResp.status || 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const skillsPayload = bridgeJson.data;

      // Salva e sincroniza as credenciais em todos os projetos irmãos do mesmo cartório no HUB
      const { error: saveError } = await supabaseAdmin.rpc("save_project_skills_credentials", {
        p_project_ids: siblingIds,
        p_skills_payload: skillsPayload,
        p_actor_name: actorName,
      });

      if (saveError) {
        throw new Error(`Acesso criado no Skills, mas falhou ao salvar no HUB: ${saveError.message}`);
      }

      return new Response(
        JSON.stringify({
          skills: {
            ...skillsPayload,
            provisioned_by: actorName,
            provisioned_at: new Date().toISOString(),
          },
          siblingProjects: siblingProjects.map((s) => ({
            id: s.id,
            client_name: s.client_name,
            system_type: s.system_type,
            ticket_number: s.ticket_number,
          })),
          orionSystems,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "update_username") {
      const newUsername = (body?.newUsername ?? "").trim();
      const cartorioId =
        body?.cartorioId ||
        existingCartorioId ||
        (targetProject.custom_fields?.skills_cartorio_id as string | undefined);
      const userId =
        body?.userId || (targetProject.custom_fields?.skills_user_id as string | undefined) || null;

      if (!cartorioId || !newUsername) {
        return new Response(
          JSON.stringify({ error: "cartorioId e newUsername são obrigatórios para atualizar o usuário." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const bridgeResp = await fetch(bridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-siplan-hub-secret": bridgeSecret,
        },
        body: JSON.stringify({
          action: "update_username",
          cartorioId,
          newUsername,
          userId,
        }),
      });

      const bridgeJson = await bridgeResp.json();
      if (!bridgeResp.ok || bridgeJson?.error) {
        return new Response(
          JSON.stringify({ error: bridgeJson?.error || "Erro ao atualizar username no Siplan Skills." }),
          {
            status: bridgeResp.status || 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const updatedUser = bridgeJson.data;

      // Atualiza skills_username em todos os projetos irmãos do mesmo cartório
      for (const sibling of siblingProjects) {
        const mergedFields = {
          ...(sibling.custom_fields || {}),
          skills_username: updatedUser.username,
          skills_user_id: updatedUser.user_id,
          skills_provisioned_by: actorName,
          skills_provisioned_at: new Date().toISOString(),
        };

        await supabaseAdmin
          .from("projects")
          .update({ custom_fields: mergedFields, updated_at: new Date().toISOString() })
          .eq("id", sibling.id);

        await supabaseAdmin.from("project_logs").insert({
          project_id: sibling.id,
          type: "system",
          message: `Nome de usuário do Siplan Skills atualizado para: ${updatedUser.username}`,
          author: actorName,
        });
      }

      return new Response(
        JSON.stringify({
          username: updatedUser.username,
          user_id: updatedUser.user_id,
          siblingIds,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get_status") {
      const cartorioId =
        body?.cartorioId ||
        existingCartorioId ||
        (targetProject.custom_fields?.skills_cartorio_id as string | undefined) ||
        null;
      const cartorioNome = (body?.cartorioNome || targetProject.client_name || "").trim();
      const candidateUsernames = Array.isArray(body?.candidateUsernames) ? body.candidateUsernames : [];

      const bridgeResp = await fetch(bridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-siplan-hub-secret": bridgeSecret,
        },
        body: JSON.stringify({
          action: "get_status",
          cartorioId,
          cartorioNome,
          candidateUsernames,
        }),
      });

      const bridgeJson = await bridgeResp.json();
      if (!bridgeResp.ok || bridgeJson?.error) {
        return new Response(
          JSON.stringify({ error: bridgeJson?.error || "Erro ao consultar status no Siplan Skills." }),
          {
            status: bridgeResp.status || 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const statusData = bridgeJson.data;

      if (statusData?.found && statusData?.cartorio_id) {
        await supabaseAdmin.rpc("save_project_skills_credentials", {
          p_project_ids: siblingIds,
          p_skills_payload: statusData,
          p_actor_name: "__SILENT_SYNC__",
        });
      }

      return new Response(
        JSON.stringify({
          status: statusData,
          siblingProjects: siblingProjects.map((s) => ({
            id: s.id,
            client_name: s.client_name,
            system_type: s.system_type,
            ticket_number: s.ticket_number,
          })),
          orionSystems,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno na integração Siplan Skills.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
