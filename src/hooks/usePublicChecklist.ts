import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSingleCommercialChecklist, useCommercialChecklists } from "@/hooks/useCommercialChecklists";
import { useToast } from "@/hooks/use-toast";
import { formatBrazilianPhone, validateBrazilianPhone } from "@/utils/phone";

export interface KeyPerson {
  name: string;
  role: string;
  contact: string;
}

export function usePublicChecklist() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: checklist, isLoading, error } = useSingleCommercialChecklist(id || null);
  const { submitChecklist } = useCommercialChecklists();

  const templateId = checklist?.template_id;
  const systemType = checklist?.projects?.systemType || "Orion TN";

  // Query the template to use
  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["checklist-template", templateId, systemType],
    queryFn: async () => {
      if (templateId) {
        const { data, error } = await supabase
          .from("form_templates")
          .select("*")
          .eq("id", templateId)
          .single();
        if (!error && data) return data;
      }
      
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("kind", "commercial_checklist")
        .eq("system_type", systemType)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!checklist,
  });

  const [dynamicResponses, setDynamicResponses] = useState<Record<string, unknown>>({});
  const [fullname, setFullname] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [fillDate, setFillDate] = useState(new Date().toISOString().split("T")[0]);
  const [floors, setFloors] = useState("");
  const [structureObs, setStructureObs] = useState("");
  const [sectors, setSectors] = useState("");
  const [sectorsDistribution, setSectorsDistribution] = useState("");
  const [sectorsObs, setSectorsObs] = useState("");
  const [keyPeople, setKeyPeople] = useState<KeyPerson[]>([{ name: "", role: "", contact: "" }]);
  const [employeesBySector, setEmployeesBySector] = useState("");
  const [totalEmployees, setTotalEmployees] = useState("");
  const [awareOfChange, setAwareOfChange] = useState("");
  const [teamAdaptability, setTeamAdaptability] = useState("");
  const [employeesObs, setEmployeesObs] = useState("");
  const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Sync draft responses once loaded
  useEffect(() => {
    if (checklist?.responses && Object.keys(checklist.responses).length > 0) {
      setDynamicResponses(checklist.responses);
    }
  }, [checklist]);

  // Set initial form states if there are draft responses
  useEffect(() => {
    if (checklist?.responses && Object.keys(checklist.responses).length > 0) {
      const r = checklist.responses;
      if (r.fullname) setFullname(r.fullname);
      if (r.role) setRole(r.role);
      if (r.email) setEmail(r.email);
      if (r.phones) setPhones(r.phones.map(formatBrazilianPhone));
      if (r.fill_date) setFillDate(r.fill_date);
      if (r.floors) setFloors(String(r.floors));
      if (r.structure_obs) setStructureObs(r.structure_obs);
      if (r.sectors) setSectors(r.sectors);
      if (r.sectors_distribution) setSectorsDistribution(r.sectors_distribution);
      if (r.sectors_obs) setSectorsObs(r.sectors_obs);
      if (r.key_people) setKeyPeople(r.key_people);
      if (r.employees_by_sector) setEmployeesBySector(r.employees_by_sector);
      if (r.total_employees) setTotalEmployees(String(r.total_employees));
      if (r.aware_of_change) setAwareOfChange(r.aware_of_change);
      if (r.team_adaptability) setTeamAdaptability(r.team_adaptability);
      if (r.employees_obs) setEmployeesObs(r.employees_obs);
    }
  }, [checklist]);

  const handlePhoneChange = (index: number, val: string) => {
    const updated = [...phones];
    updated[index] = formatBrazilianPhone(val);
    setPhones(updated);
  };

  const addPhoneField = () => {
    setPhones([...phones, ""]);
  };

  const removePhoneField = (index: number) => {
    if (phones.length <= 1) return;
    const updated = phones.filter((_, idx) => idx !== index);
    setPhones(updated);
  };

  const handleKeyPersonChange = (index: number, field: keyof KeyPerson, val: string) => {
    const updated = [...keyPeople];
    updated[index] = { ...updated[index], [field]: val };
    setKeyPeople(updated);
  };

  const addKeyPerson = () => {
    setKeyPeople([...keyPeople, { name: "", role: "", contact: "" }]);
  };

  const removeKeyPerson = (index: number) => {
    if (keyPeople.length <= 1) return;
    const updated = keyPeople.filter((_, idx) => idx !== index);
    setKeyPeople(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors = new Set<string>();
    if (!fullname.trim()) errors.add("fullname");
    if (!role.trim()) errors.add("role");
    if (!email.trim()) errors.add("email");
    if (phones.some(p => !validateBrazilianPhone(p))) errors.add("phones");
    if (!floors.trim()) errors.add("floors");
    if (!sectors.trim()) errors.add("sectors");
    if (!sectorsDistribution.trim()) errors.add("sectorsDistribution");
    if (!totalEmployees.trim()) errors.add("totalEmployees");
    if (!awareOfChange) errors.add("awareOfChange");
    if (!teamAdaptability.trim()) errors.add("teamAdaptability");

    const keyPeopleValid = keyPeople.every(p => {
      const anyFilled = p.name.trim() || p.role.trim() || p.contact.trim();
      const allFilled = p.name.trim() && p.role.trim() && p.contact.trim();
      return !anyFilled || allFilled;
    });

    if (!keyPeopleValid) {
      errors.add("keyPeople");
      toast({
        title: "Pessoas Chaves incompletas",
        description: "Preencha todos os campos (Nome, Cargo, Contato) para cada pessoa chave adicionada.",
        variant: "destructive"
      });
    }

    setFormErrors(errors);

    if (errors.size > 0) {
      toast({
        title: "Campos obrigatórios pendentes",
        description: "Por favor, revise os campos destacados em vermelho antes de enviar.",
        variant: "destructive"
      });
      setTimeout(() => {
        document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    const payload = {
      fullname,
      role,
      email,
      phones: phones.filter(p => p.trim() !== ""),
      fill_date: fillDate,
      floors: parseInt(floors, 10),
      structure_obs: structureObs,
      sectors,
      sectors_distribution: sectorsDistribution,
      sectors_obs: sectorsObs,
      key_people: keyPeople.filter(p => p.name.trim() !== ""),
      employees_by_sector: employeesBySector,
      total_employees: parseInt(totalEmployees, 10),
      aware_of_change: awareOfChange,
      team_adaptability: teamAdaptability,
      employees_obs: employeesObs,
    };

    submitChecklist.mutate({ id: checklist.id, responses: payload }, {
      onSuccess: () => {
        setSubmittedSuccess(true);
      }
    });
  };

  const handleDynamicSubmit = (responses: Record<string, unknown>) => {
    submitChecklist.mutate({ id: checklist.id, responses }, {
      onSuccess: () => {
        setSubmittedSuccess(true);
      }
    });
  };

  return {
    checklist,
    isLoading: isLoading || (!!checklist && isLoadingTemplate),
    error,
    template,
    dynamicResponses,
    setDynamicResponses,
    fullname,
    setFullname,
    role,
    setRole,
    email,
    setEmail,
    phones,
    setPhones,
    fillDate,
    setFillDate,
    floors,
    setFloors,
    structureObs,
    setStructureObs,
    sectors,
    setSectors,
    sectorsDistribution,
    setSectorsDistribution,
    sectorsObs,
    setSectorsObs,
    keyPeople,
    setKeyPeople,
    employeesBySector,
    setEmployeesBySector,
    totalEmployees,
    setTotalEmployees,
    awareOfChange,
    setAwareOfChange,
    teamAdaptability,
    setTeamAdaptability,
    employeesObs,
    setEmployeesObs,
    formErrors,
    submittedSuccess,
    handlePhoneChange,
    addPhoneField,
    removePhoneField,
    handleKeyPersonChange,
    addKeyPerson,
    removeKeyPerson,
    handleSubmit,
    handleDynamicSubmit,
    isSubmitPending: submitChecklist.isPending,
  };
}
