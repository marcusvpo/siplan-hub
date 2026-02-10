import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConversionPost {
  id: string;
  projectId: string;
  queueId: string | null;
  authorId: string | null;
  authorName: string;
  content: string;
  imageUrls: string[];
  postType: "update" | "stage_change" | "issue" | "resolution" | "note";
  stage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RawPost {
  id: string;
  project_id: string;
  queue_id: string | null;
  author_id: string | null;
  author_name: string;
  content: string;
  image_urls: string[] | null;
  post_type: string;
  stage: string | null;
  created_at: string;
  updated_at: string;
}

function mapPost(raw: RawPost): ConversionPost {
  return {
    id: raw.id,
    projectId: raw.project_id,
    queueId: raw.queue_id,
    authorId: raw.author_id,
    authorName: raw.author_name,
    content: raw.content,
    imageUrls: raw.image_urls || [],
    postType: raw.post_type as ConversionPost["postType"],
    stage: raw.stage,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}

export function useConversionPosts(projectId: string | null) {
  const [posts, setPosts] = useState<ConversionPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [postCount, setPostCount] = useState(0);

  const fetchPosts = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("conversion_posts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map(mapPost);
      setPosts(mapped);
      setPostCount(mapped.length);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(
    async (params: {
      content: string;
      queueId?: string;
      imageUrls?: string[];
      postType?: ConversionPost["postType"];
      stage?: string;
      authorName: string;
    }) => {
      if (!projectId) return null;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("conversion_posts")
          .insert({
            project_id: projectId,
            queue_id: params.queueId || null,
            author_id: user?.id || null,
            author_name: params.authorName,
            content: params.content,
            image_urls: params.imageUrls || [],
            post_type: params.postType || "update",
            stage: params.stage || null,
          })
          .select()
          .single();

        if (error) throw error;
        const newPost = mapPost(data);
        setPosts((prev) => [newPost, ...prev]);
        setPostCount((prev) => prev + 1);
        return newPost;
      } catch (err) {
        console.error("Error creating post:", err);
        toast.error("Erro ao criar publicação");
        return null;
      }
    },
    [projectId],
  );

  const deletePost = useCallback(async (postId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("conversion_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPostCount((prev) => prev - 1);
      toast.success("Publicação removida");
    } catch (err) {
      console.error("Error deleting post:", err);
      toast.error("Erro ao remover publicação");
    }
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("conversion-posts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("conversion-posts")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Erro ao enviar imagem");
      return null;
    }
  }, [projectId]);

  return {
    posts,
    loading,
    postCount,
    createPost,
    deletePost,
    uploadImage,
    refetch: fetchPosts,
  };
}

export function usePostCount(projectId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: c, error } = await (supabase as any)
        .from("conversion_posts")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      if (!error && c !== null) setCount(c);
    })();
  }, [projectId]);

  return count;
}
