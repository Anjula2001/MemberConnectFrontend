import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "../ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

import { ChevronDown, Home, Users, GraduationCap, Heart, BarChart } from "lucide-react";

export default function NavigationSideBar() {
  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      url: "/",
    },
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
    {
      title: "Death Donation",
      icon: Heart,
      url: "/death-donation",
    },
    {
      title: "Reports",
      icon: BarChart,
      url: "/reports",
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.subMenu ? (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger>
                        <item.icon />
                        <span className="ml-2">{item.title}</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {item.subMenu.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton asChild>
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              ) : (
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
