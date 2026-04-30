'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

import { ChevronDown, Home, Users, GraduationCap, Heart, BarChart } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link"; // Use Link for better Next.js integration

export default function NavigationSideBar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same width to prevent "flicker"
    return <div className="w-[260px] h-screen bg-sidebar" />; 
  }

  const menuItems = [
    { title: "Dashboard", icon: Home, url: "/" },
    {
      title: "Membership",
      icon: Users,
      subMenu: [
        { title: "New Registrations", url: "/membership/new-registrations" },
        { title: "Board Approvals", url: "/membership/board-approvals" },
        { title: "Member Directory", url: "/membership/directory" },
        { title: "Profile Changes", url: "/membership/profile-changes" },
        { title: "Termination & Retirement", url: "/membership/termination" },
        { title: "Dormant Members", url: "/membership/dormant" },
      ],
    },
    {
      title: "Scholarships",
      icon: GraduationCap,
      subMenu: [
        { title: "Grade 5", url: "/scholarships/grade-5" },
        { title: "University", url: "/scholarships/university" },
        { title: "Fund Requests", url: "/scholarships/fund-requests" },
      ],
    },
    { title: "Death Donation", icon: Heart, url: "/death-donation" },
    { title: "Reports", icon: BarChart, url: "/reports" },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu className="p-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.subMenu ? (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarGroup className="p-0">
                    {/* FIXED: Removed SidebarGroupLabel nesting issue */}
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <SidebarGroupContent className="ml-4 border-l border-orange-100 pl-2">
                        <SidebarMenu>
                          {item.subMenu.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton asChild size="sm">
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              ) : (
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}