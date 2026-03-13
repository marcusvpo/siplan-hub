import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { menuItems, MenuItem } from "@/constants/menuItems";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { usePermissions } from "@/hooks/usePermissions";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export default function Home() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<MenuItem | null>(null);
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { hasPermission, isAdmin } = usePermissions();

    // Filter menu items the user has permission to see
    const allowedMenuItems = useMemo(() => {
        return menuItems.filter(item => {
            if (!item.permissionKey) return true; // No permission required (e.g. Dashboard)
            if (isAdmin) return true;
            return hasPermission(item.permissionKey, "view");
        });
    }, [hasPermission, isAdmin]);

    const isDark =
        theme === "dark" ||
        (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
    const logoSrc = isDark
        ? "/assets/Siplan_logo_branco.png"
        : "/assets/Siplan_logo.png";

    const filteredItems = useMemo(() => {
        if (!search) return allowedMenuItems;

        return allowedMenuItems.map(item => {
            const itemMatches =
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.description?.toLowerCase().includes(search.toLowerCase());

            const matchingSubItems = item.subItems?.filter(sub =>
                sub.title.toLowerCase().includes(search.toLowerCase()) ||
                sub.description?.toLowerCase().includes(search.toLowerCase())
            );

            if (itemMatches || (matchingSubItems && matchingSubItems.length > 0)) {
                return {
                    ...item,
                    subItems: matchingSubItems?.length ? matchingSubItems : item.subItems
                };
            }
            return null;
        }).filter(Boolean) as MenuItem[];
    }, [search, allowedMenuItems]);

    // Flattened suggestions for direct search
    const searchSuggestions = useMemo(() => {
        if (!search || search.length < 2) return [];

        const suggestions: Array<{
            item: MenuItem["subItems"][0];
            parentTitle: string;
        }> = [];

        allowedMenuItems.forEach(category => {
            category.subItems?.forEach(sub => {
                const matches =
                    sub.title.toLowerCase().includes(search.toLowerCase()) ||
                    sub.description?.toLowerCase().includes(search.toLowerCase());

                if (matches) {
                    suggestions.push({
                        item: sub,
                        parentTitle: category.title
                    });
                }
            });
        });

        return suggestions;
    }, [search, allowedMenuItems]);

    const handleCardClick = (item: MenuItem) => {
        if (item.path) {
            navigate(item.path);
        } else if (item.subItems) {
            setSelectedCategory(item);
        }
    };

    return (
        <div className="container mx-auto py-6 px-6 max-w-6xl space-y-8 animate-in fade-in duration-700">
            {/* Header & Search */}
            <div className="space-y-4 text-center max-w-4xl mx-auto">
                <div className="flex flex-row items-center justify-center gap-3">
                    <img
                        src={logoSrc}
                        alt="Siplan Logo"
                        className="h-14 w-auto transition-all duration-300 ease-in-out"
                    />
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-rose-600 bg-clip-text text-transparent">
                        HUB
                    </h1>
                </div>
                <p className="text-muted-foreground text-base">
                    Centralize sua gestão e localize ferramentas rapidamente.
                </p>

                <div className="relative group max-w-lg mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Encontrar tela..."
                        className="pl-11 h-12 text-base rounded-2xl border-2 focus-visible:ring-primary/20 transition-all shadow-lg shadow-black/5"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Search Suggestions List */}
            <AnimatePresence>
                {searchSuggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="max-w-xl mx-auto bg-card border-2 border-primary/20 rounded-2xl overflow-hidden shadow-xl"
                    >
                        <div className="p-2 space-y-1">
                            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-50">
                                Sugestões de Telas
                            </div>
                            {searchSuggestions.map((suggestion, idx) => {
                                const SubIcon = suggestion.item.icon;
                                return (
                                    <button
                                        key={`${suggestion.parentTitle}-${suggestion.item.path}`}
                                        onClick={() => navigate(suggestion.item.path)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 hover:text-primary transition-all text-left group"
                                    >
                                        <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                                            <SubIcon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm leading-none flex items-center gap-2">
                                                {suggestion.item.title}
                                                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                                                    {suggestion.parentTitle}
                                                </span>
                                            </div>
                                            {suggestion.item.description && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                    {suggestion.item.description}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Categories Grid (only show if not searching or if search returns categories) */}
            <div className="space-y-4">
                {search && filteredItems.length > 0 && (
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground opacity-50 pl-2">
                        Categorias Relacionadas
                    </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredItems.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <motion.div
                                key={item.title}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -4 }}
                            >
                                <Card
                                    className="cursor-pointer overflow-hidden border-2 transition-all hover:border-primary/50 hover:shadow-xl group border-muted h-full"
                                    onClick={() => handleCardClick(item)}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            {item.subItems && (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                            )}
                                        </div>

                                        <div className="mt-3 space-y-1">
                                            <h3 className="font-bold text-lg tracking-tight">{item.title}</h3>
                                            {item.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && searchSuggestions.length === 0 && search && (
                <div className="text-center py-20 space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-muted">
                        <Search className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-medium text-muted-foreground">
                        Nenhuma tela encontrada para "{search}"
                    </p>
                    <button
                        onClick={() => setSearch("")}
                        className="text-primary hover:underline font-semibold"
                    >
                        Limpar pesquisa
                    </button>
                </div>
            )}

            {/* Submenu Dialog */}
            <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
                <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    {selectedCategory && (
                        <div className="flex flex-col h-full">
                            <DialogHeader className="p-8 pb-4 bg-muted/30">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                                        <selectedCategory.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1 text-left">
                                        <DialogTitle className="text-2xl font-bold tracking-tight">
                                            {selectedCategory.title}
                                        </DialogTitle>
                                        <DialogDescription className="text-base text-muted-foreground">
                                            {selectedCategory.description}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-4 bg-background max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-1 gap-2">
                                    {selectedCategory.subItems?.map((sub, idx) => {
                                        const SubIcon = sub.icon;
                                        if (sub.permissionKey && !isAdmin && !hasPermission(sub.permissionKey, "view")) {
                                          return null;
                                        }
                                        
                                        return (
                                            <motion.button
                                                key={sub.path}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                onClick={() => {
                                                    navigate(sub.path);
                                                    setSelectedCategory(null);
                                                }}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all text-left group border border-transparent hover:border-primary/10"
                                            >
                                                <div className="p-2 rounded-xl bg-muted group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                    <SubIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 space-y-0.5">
                                                    <div className="font-bold text-base leading-none">{sub.title}</div>
                                                    {sub.description && (
                                                        <div className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">
                                                            {sub.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-50" />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-6 bg-muted/10 border-t flex justify-end">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="px-6 py-2 rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
