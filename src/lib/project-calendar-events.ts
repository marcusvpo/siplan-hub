import type { ProjectV2 } from "@/types/ProjectV2";
import { CALENDAR_MEMBERS, type CalendarEvent } from "@/types/calendar";

function findCalendarMember(name: string) {
  const normalizedName = name.toLowerCase().trim();
  if (!normalizedName) return undefined;

  return CALENDAR_MEMBERS.find((member) => {
    const memberName = member.name.toLowerCase();
    return (
      memberName === normalizedName ||
      memberName.includes(normalizedName) ||
      normalizedName.includes(memberName)
    );
  });
}

function getFallbackColor(name: string) {
  const colors = [
    "bg-indigo-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-purple-500",
    "bg-cyan-500",
  ];
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function toLocalCalendarDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" && value.length === 10
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildProjectCalendarEvents(projects: ProjectV2[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  projects.forEach((project) => {
    const phase1 = project.stages.implementation?.phase1;
    const phase1Start = toLocalCalendarDate(phase1?.startDate);
    const phase1End = toLocalCalendarDate(phase1?.endDate);
    const phase1Responsible = phase1?.responsible;

    if (phase1Start && phase1End && phase1Responsible) {
      const member = findCalendarMember(phase1Responsible);
      events.push({
        id: `real-${project.id}-p1`,
        resourceId: member?.id || "unknown",
        title: `Implantação: ${project.clientName}`,
        clientName: project.clientName,
        start: phase1Start,
        end: phase1End,
        type: "implementation",
        status: phase1.status === "done" ? "completed" : "confirmed",
        projectId: project.id,
        responsibleName: phase1Responsible,
        notes: phase1.observations,
        color: member?.color || getFallbackColor(phase1Responsible),
      });
    }

    const phase2 = project.stages.implementation?.phase2;
    const phase2Start = toLocalCalendarDate(phase2?.startDate);
    const phase2End = toLocalCalendarDate(phase2?.endDate);
    const phase2Responsible = phase2?.responsible;

    if (phase2Start && phase2End && phase2Responsible) {
      const member = findCalendarMember(phase2Responsible);
      events.push({
        id: `real-${project.id}-p2`,
        resourceId: member?.id || "unknown",
        title: `Treinamento: ${project.clientName}`,
        clientName: project.clientName,
        start: phase2Start,
        end: phase2End,
        type: "training",
        status: phase2.status === "done" ? "completed" : "confirmed",
        projectId: project.id,
        responsibleName: phase2Responsible,
        notes: phase2.observations,
        color: member?.color || getFallbackColor(phase2Responsible),
      });
    }

    const adherence = project.stages.adherence;
    const adherenceDate = toLocalCalendarDate(adherence?.endDate);
    const adherenceResponsible = adherence?.responsible;

    if (adherenceDate && adherenceResponsible) {
      const member = findCalendarMember(adherenceResponsible);
      events.push({
        id: `real-${project.id}-adherence`,
        resourceId: member?.id || "unknown",
        title: `Aderência: ${project.clientName}`,
        clientName: project.clientName,
        start: adherenceDate,
        end: adherenceDate,
        type: "adherence",
        status: adherence.status === "done" ? "completed" : "confirmed",
        projectId: project.id,
        responsibleName: adherenceResponsible,
        notes: adherence.observations,
        color: "bg-amber-500",
      });
    }

    const conversion = project.stages.conversion;
    const homologationDate = toLocalCalendarDate(conversion?.finishedAt);
    const homologationResponsible = conversion?.homologationResponsible;

    if (homologationDate && homologationResponsible) {
      const member = findCalendarMember(homologationResponsible);
      events.push({
        id: `real-${project.id}-homologation`,
        resourceId: member?.id || "unknown",
        title: `Homologação: ${project.clientName}`,
        clientName: project.clientName,
        start: homologationDate,
        end: homologationDate,
        type: "homologation",
        status: conversion.status === "done" ? "completed" : "confirmed",
        projectId: project.id,
        responsibleName: homologationResponsible,
        notes: conversion.observations,
        color: "bg-violet-500",
      });
    }
  });

  return events;
}
