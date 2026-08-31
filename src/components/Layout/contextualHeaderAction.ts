import { menuItems } from "@/constants/menuItems";
import type { LucideIcon } from "lucide-react";

export interface ContextualHeaderAction {
  label: string;
  path: string;
  icon: LucideIcon;
}

export function getContextualHeaderAction(
  pathname: string,
  canView: (permissionKey?: string) => boolean,
): ContextualHeaderAction | null {
  const currentPath = pathname.replace(/\/+$/, "") || "/";
  if (currentPath === "/") return null;

  const currentModule = menuItems.find((item) => {
    if (item.path && matchesPath(currentPath, item.path)) return true;
    return item.subItems?.some((subItem) => matchesPath(currentPath, subItem.path));
  });

  if (!currentModule?.path || !canView(currentModule.permissionKey)) return null;

  if (currentPath === currentModule.path) {
    const primaryDestination = currentModule.subItems?.find(
      (subItem) => subItem.path !== currentPath && canView(subItem.permissionKey),
    );

    return primaryDestination
      ? {
          label: primaryDestination.title,
          path: primaryDestination.path,
          icon: primaryDestination.icon,
        }
      : null;
  }

  return {
    label: `Visão geral · ${currentModule.title}`,
    path: currentModule.path,
    icon: currentModule.icon,
  };
}

function matchesPath(currentPath: string, candidatePath: string) {
  return currentPath === candidatePath || currentPath.startsWith(`${candidatePath}/`);
}
