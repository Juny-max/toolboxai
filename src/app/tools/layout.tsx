"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, Coffee } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { tools, toolCategories } from "@/lib/tools";
import type { Tool } from "@/lib/tools";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { favorites, isMounted } = useFavorites();

  const favoriteTools = isMounted ? tools.filter((tool) => favorites.includes(tool.slug)) : [];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="block">
            <Logo />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {isMounted && favoriteTools.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2">
                  <Star className="size-3.5 fill-yellow-400 text-yellow-500" />
                  <span>Favorites</span>
                </SidebarGroupLabel>
                {favoriteTools.map((tool) => (
                  <SidebarMenuItem key={tool.slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/tools/${tool.slug}`}
                      tooltip={{children: tool.name}}
                    >
                      <Link href={`/tools/${tool.slug}`}>
                        <tool.icon />
                        <span>{tool.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
            )}

            {toolCategories.map((category) => (
              <SidebarGroup key={category}>
                <SidebarGroupLabel>{category}</SidebarGroupLabel>
                {tools
                  .filter((tool) => tool.category === category)
                  .map((tool: Tool) => (
                    <SidebarMenuItem key={tool.slug}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/tools/${tool.slug}`}
                        tooltip={{children: tool.name}}
                      >
                        <Link href={`/tools/${tool.slug}`}>
                          <tool.icon />
                          <span>{tool.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarGroup>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{children: "Support me"}}
              >
                <Link href="https://buymeacoffee.com/junybase" target="_blank">
                  <Coffee />
                  <span>Support me</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
             <div className="md:hidden">
                <Logo />
             </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
