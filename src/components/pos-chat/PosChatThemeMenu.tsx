import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PosChatThemeMenu() {
  const { theme, setTheme } = useTheme();
  const selectedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const handleThemeChange = (value: string) => {
    if (value === "light" || value === "dark") {
      setTheme(value);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg bg-white/70 dark:bg-neutral-900/70"
          aria-label="Escolher tema da conversa"
          title="Tema da conversa"
        >
          <Sun className="h-4 w-4 dark:hidden" aria-hidden="true" />
          <Moon className="hidden h-4 w-4 dark:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs">Tema da conversa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedTheme}
          onValueChange={handleThemeChange}
        >
          <DropdownMenuRadioItem value="light" className="cursor-pointer gap-2 text-xs">
            <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="cursor-pointer gap-2 text-xs">
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            Escuro
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
