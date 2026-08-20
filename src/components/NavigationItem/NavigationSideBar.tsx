"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/auth-context";
import {
  canAccessFundRequests,
  canAccessGrade5,
  canAccessUniversityScholarships,
  hasPermission,
} from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "../ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

import {
  BarChart,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Heart,
  Home,
  Send,
  SlidersHorizontal,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SubMenuItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

type MenuItem = {
  title: string;
  icon: LucideIcon;
  url?: string;
  subMenu?: SubMenuItem[];
};

export default function NavigationSideBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  /**
   * Builds the Scholarships menu for a role, or null when the role has nothing in it.
   *
   * Every entry is now permission-gated — Grade 5 (MMS01–MMS20) and University
   * (MMS21–MMS48) alike — so the menu is derived from the matrix rather than from
   * which branch of this function a role happens to land in.
   *
   * Previously District Office and Head Office had no Scholarships menu at all, while
   * Death Donation Officer got the whole thing by falling through a catch-all branch.
   * That is backwards: those first two are the SRS's named actors for both modules.
   */
  const buildScholarshipsMenu = (role: UserRole | undefined): MenuItem | null => {
    const subMenu: SubMenuItem[] = [];

    if (canAccessGrade5(role)) {
      subMenu.push({ title: "Grade 5", url: "/scholarships/grade-5" });
    }

    if (hasPermission(role, "G5_EXAM_MASTER_MANAGE")) {
      subMenu.push({
        title: "Grade 5 Exam & Cut-offs",
        url: "/scholarships/grade-5/manage-exam-cutoff",
      });
    }

    if (canAccessUniversityScholarships(role)) {
      subMenu.push({ title: "University", url: "/scholarships/university" });
    }

    if (canAccessFundRequests(role)) {
      subMenu.push({ title: "Fund Requests", url: "/scholarships/fund-requests" });
    }

    if (subMenu.length === 0) {
      return null;
    }

    return { title: "Scholarships", icon: GraduationCap, subMenu };
  };

  const getFilteredMenuItems = (): MenuItem[] => {
    const role = user?.role;

    // 1. District Office: Focus on Member Creation & Directory
    if (role === "DISTRICT_OFFICE") {
      return [
        {
          title: "Dashboard",
          icon: Home,
          url: "/",
        },
        {
          title: "Membership",
          icon: Users,
          subMenu: [
            {
              title: "New Registrations",
              url: "/membership/new-registrations",
              icon: UserPlus,
            },
            {
              title: "Member Directory",
              url: "/membership/directory",
              icon: Users,
            },
            {
              title: "Documentation Dispatch",
              url: "/membership/dispatch",
              icon: Send,
            },
          ],
        },
        // District Office is the SRS's named actor for creating Grade 5 requests
        // (MMS01–MMS05), so the module belongs in this menu.
        ...([buildScholarshipsMenu(role)].filter(
          Boolean
        ) as MenuItem[]),
      ];
    }

    // 2. Board Secretary / Head Office: Full Member Registration Governance & Approvals
    if (role === "BOARD_SECRETARY" || role === "HEAD_OFFICE") {
      return [
        {
          title: "Dashboard",
          icon: Home,
          url: "/",
        },
        {
          title: "Membership",
          icon: Users,
          subMenu: [
            {
              title: "New Registrations",
              url: "/membership/new-registrations",
              icon: UserPlus,
            },
            {
              title: "Board Approvals",
              url: "/membership/board-approvals",
              icon: ClipboardList,
            },
            {
              title: "Member Directory",
              url: "/membership/directory",
              icon: Users,
            },
            {
              title: "Print Membership Cards",
              url: "/membership/print-membership-cards",
              icon: CreditCard,
            },
            {
              title: "Print Signature Cards",
              url: "/membership/print-signature-cards",
              icon: CreditCard,
            },
            {
              title: "Print Passbooks",
              url: "/membership/print-passbooks",
              icon: CreditCard,
            },
            {
              title: "Documentation Dispatch",
              url: "/membership/dispatch",
              icon: Send,
            },
            {
              title: "Profile Changes",
              url: "/membership/profile-changes",
              icon: FileText,
            },
            {
              title: "Termination & Retirement",
              url: "/membership/termination",
              icon: UserMinus,
            },
            {
              title: "Dormant Members",
              url: "/membership/dormant",
              icon: UserCheck,
            },
          ],
        },
        // Head Office / Board Secretary own the Grade 5 approval track
        // (MMS06–MMS19) — the module was previously unreachable for them.
        ...([buildScholarshipsMenu(role)].filter(
          Boolean
        ) as MenuItem[]),
        { title: "Reports", icon: BarChart, url: "/reports" },
      ];
    }

    // 3. Super Admin: full access, including Member Registration governance.
    if (role === "SUPER_ADMIN") {
      return [
        {
          title: "Dashboard",
          icon: Home,
          url: "/",
        },
        {
          title: "Membership",
          icon: Users,
          subMenu: [
            {
              title: "New Registrations",
              url: "/membership/new-registrations",
              icon: UserPlus,
            },
            {
              title: "Board Approvals",
              url: "/membership/board-approvals",
              icon: ClipboardList,
            },
            {
              title: "Member Directory",
              url: "/membership/directory",
              icon: Users,
            },
            {
              title: "Print Membership Cards",
              url: "/membership/print-membership-cards",
              icon: CreditCard,
            },
            {
              title: "Print Signature Cards",
              url: "/membership/print-signature-cards",
              icon: CreditCard,
            },
            {
              title: "Print Passbooks",
              url: "/membership/print-passbooks",
              icon: CreditCard,
            },
            {
              title: "Documentation Dispatch",
              url: "/membership/dispatch",
              icon: Send,
            },
            {
              title: "Profile Changes",
              url: "/membership/profile-changes",
              icon: FileText,
            },
            {
              title: "Termination & Retirement",
              url: "/membership/termination",
              icon: UserMinus,
            },
            {
              title: "Dormant Members",
              url: "/membership/dormant",
              icon: UserCheck,
            },
          ],
        },
        ...([buildScholarshipsMenu(role)].filter(
          Boolean
        ) as MenuItem[]),
        { title: "Death Donation", icon: Heart, url: "/death-donation" },
        { title: "Reports", icon: BarChart, url: "/reports" },
        {
          title: "Administration",
          icon: UserCog,
          subMenu: [
            { title: "User Management", url: "/admin/users", icon: UserCog },
            {
              title: "Remittance Master",
              url: "/admin/remittance-master",
              icon: Wallet,
            },
            {
              title: "Membership Eligibility",
              url: "/admin/membership-eligibility",
              icon: SlidersHorizontal,
            },
            {
              title: "Member Accounts",
              url: "/admin/member-accounts",
              icon: Wallet,
            },
            {
              title: "University Master",
              url: "/admin/university-master",
              icon: GraduationCap,
            },
          ],
        },
      ];
    }

    // 4. Accounts: not an actor in the Member Registration flow itself, but owns the
    // Remittance Master (member contribution amounts), which is a finance parameter.
    if (role === "ACCOUNTS") {
      return [
        {
          title: "Dashboard",
          icon: Home,
          url: "/",
        },
        {
          title: "Administration",
          icon: UserCog,
          subMenu: [
            {
              title: "Member Accounts",
              url: "/admin/member-accounts",
              icon: Wallet,
            },
            {
              title: "Remittance Master",
              url: "/admin/remittance-master",
              icon: Wallet,
            },
          ],
        },
        { title: "Reports", icon: BarChart, url: "/reports" },
      ];
    }

    // 5. Everyone else (Scholarship Officer, Death Donation Officer, and any future role
    // not explicitly handled above) — these roles are not actors in the Member
    // Registration spec, so they get no Membership access at all rather than silently
    // inheriting it from a catch-all branch. They keep access to their own modules only.
    //
    // Grade 5 is no longer part of that inheritance: it appears here only if the role
    // actually holds a Grade 5 permission, so Death Donation Officer now sees the
    // University items it already had and nothing more.
    return [
      {
        title: "Dashboard",
        icon: Home,
        url: "/",
      },
      ...([buildScholarshipsMenu(role)].filter(
        Boolean
      ) as MenuItem[]),
      { title: "Death Donation", icon: Heart, url: "/death-donation" },
      { title: "Reports", icon: BarChart, url: "/reports" },
    ];
  };

  const menuItems = getFilteredMenuItems();

  const isItemActive = (url?: string) => {
    if (!url) return false;
    if (url === "/") return pathname === "/";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar className="border-r border-neutral-200 bg-[#f4f4f5]">
      <SidebarHeader className="flex h-16 shrink-0 items-center border-b border-neutral-200 bg-[#f4f4f5] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#9e3600] text-lg font-bold text-white shadow-sm">
            M
          </div>
          <span className="text-[18px] font-semibold tracking-tight text-[#9e3600]">
            MemberConnect
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[#f4f4f5] px-3 py-4">
        <SidebarMenu className="gap-1.5 px-0.5">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.subMenu ? (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarGroup className="p-0">
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="flex h-10 w-full items-center rounded-lg px-3 text-[15px] font-medium text-[#333333] transition-colors duration-200 hover:bg-[#fdf5f2]/50 hover:text-[#953002]">
                        <item.icon className="h-5 w-5" />
                        <span className="ml-3">{item.title}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent className="pt-1">
                        <SidebarMenu className="gap-1">
                          {item.subMenu.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              {/** Only this entry should wrap to two lines, matching the reference. */}
                              {(() => {
                                const isTwoLineItem =
                                  subItem.url === "/membership/termination";

                                return (
                                  <SidebarMenuButton
                                    asChild
                                    isActive={isItemActive(subItem.url)}
                                    className={cn(
                                      "rounded-lg pr-2.5 text-[14px] font-medium text-[#333333] transition-colors duration-200 hover:bg-[#fdf5f2]/50 hover:text-[#953002] data-[active=true]:bg-[#fdf5f2] data-[active=true]:text-[#953002]",
                                      isTwoLineItem
                                        ? "h-11 leading-4 [&>span:last-child]:whitespace-normal [&>span:last-child]:wrap-break-word"
                                        : "h-9 leading-4 [&>span:last-child]:truncate [&>span:last-child]:whitespace-nowrap",
                                      subItem.icon ? "pl-8" : "pl-10",
                                      isItemActive(subItem.url) && "bg-[#fdf5f2] text-[#953002]"
                                    )}
                                  >
                                    <Link href={subItem.url}>
                                      <span className="inline-flex w-4 items-center justify-center">
                                        {subItem.icon ? (
                                          <subItem.icon className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </span>
                                      <span className="ml-2">{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuButton>
                                );
                              })()}
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isItemActive(item.url)}
                  className={cn(
                    "h-10 rounded-lg px-3 text-[15px] font-medium text-[#333333] transition-colors duration-200 hover:bg-[#fdf5f2]/50 hover:text-[#953002] data-[active=true]:bg-[#fdf5f2] data-[active=true]:text-[#953002]",
                    isItemActive(item.url) && "bg-[#fdf5f2] text-[#953002]"
                  )}
                >
                  <Link href={item.url!}>
                    <item.icon className="h-5 w-5" />
                    <span className="ml-2.5">{item.title}</span>
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