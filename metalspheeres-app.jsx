import { useState } from "react";
import {
  Building2,
  Users,
  MapPin,
  Briefcase,
  Target,
  ShoppingCart,
  Package,
  Truck,
  Calendar,
  FileText,
  Mail,
  UsersRound,
  LayoutTemplate,
  Globe,
  Database,
  BookOpen,
  Table2,
  Columns3,
  FormInput,
  Palette,
  Shield,
  Tags,
  FolderTree,
  ToggleLeft,
  Key,
  Languages,
  Boxes,
  Settings,
  UserCog,
  Lock,
  Eye,
  ListTodo,
  Clock,
  Webhook,
  History,
  Terminal,
  Gauge,
  Search,
  Network,
  Send,
  HardDrive,
  PenTool,
  Monitor,
  DatabaseZap,
  LayoutDashboard,
  Workflow,
  ChevronDown,
  ChevronRight,
  Circle,
  Menu,
  X,
  Bell,
  CircleUser,
  Grip,
  Layers,
  Cog,
} from "lucide-react";

// ============================================================================
// MENU STRUCTURE
// ============================================================================
const menuGroups = [
  {
    id: "primary",
    label: "Primary",
    color: "#64748B",
    accentColor: "#475569",
    icon: Layers,
    description: "Business entities",
    items: [
      { id: "companies", label: "Companies", icon: Building2 },
      { id: "contacts", label: "Contacts", icon: Users },
      { id: "addresses", label: "Addresses", icon: MapPin },
      { id: "projects", label: "Projects", icon: Briefcase },
      { id: "opportunities", label: "Opportunities", icon: Target },
      { id: "cases", label: "Cases", icon: ListTodo },
      { id: "products", label: "Products", icon: Package },
      { id: "orders", label: "Orders", icon: ShoppingCart },
      { id: "suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    color: "#0EA5E9",
    accentColor: "#0284C7",
    icon: Grip,
    description: "Shared resources",
    items: [
      { id: "agenda", label: "Agenda", icon: Calendar },
      { id: "documents", label: "Documents", icon: FileText },
      { id: "mails", label: "Mails", icon: Mail },
      { id: "groups", label: "Groups", icon: UsersRound },
      { id: "templates", label: "Templates", icon: LayoutTemplate },
      { id: "actions", label: "Actions", icon: Send },
    ],
  },
  {
    id: "system",
    label: "System",
    color: "#F59E0B",
    accentColor: "#D97706",
    icon: Cog,
    description: "System tables",
    items: [
      { id: "sys_users", label: "Users", icon: UserCog },
      { id: "sys_rights", label: "Rights", icon: Shield },
      { id: "sys_security", label: "Security", icon: Lock },
      { id: "sys_sessions", label: "Sessions", icon: Eye },
      { id: "sys_logs", label: "Logs", icon: History },
      { id: "sys_globals", label: "Globals", icon: Globe },
      { id: "sys_queues", label: "Queues", icon: ListTodo },
      { id: "sys_commands", label: "Commands", icon: Terminal },
      { id: "sys_planning", label: "Planning", icon: Clock },
      { id: "sys_hooks", label: "Hooks", icon: Webhook },
      { id: "sys_objects", label: "Objects", icon: Boxes },
      { id: "sys_things", label: "Things", icon: HardDrive },
      { id: "sys_thesauri", label: "Thesauri", icon: BookOpen },
      { id: "sys_transports", label: "Transports", icon: Network },
      { id: "sys_competences", label: "Competences", icon: Gauge },
      { id: "sys_history", label: "History", icon: History },
      { id: "sys_locks", label: "Locks", icon: Lock },
    ],
  },
  {
    id: "dictionary",
    label: "Dictionary",
    color: "#3B82F6",
    accentColor: "#2563EB",
    icon: BookOpen,
    description: "Metadata tables",
    items: [
      { id: "cd_dictionaries", label: "Dictionaries", icon: BookOpen },
      { id: "cd_databases", label: "Databases", icon: Database },
      { id: "cd_tables", label: "Tables", icon: Table2 },
      { id: "cd_fields", label: "Fields", icon: Columns3 },
      { id: "cd_controls", label: "Controls", icon: FormInput },
      { id: "cd_forms", label: "Forms", icon: LayoutTemplate },
      { id: "cd_types", label: "Types", icon: Tags },
      { id: "cd_folders", label: "Folders", icon: FolderTree },
      { id: "cd_lifestatuses", label: "Life Statuses", icon: ToggleLeft },
      { id: "cd_licenses", label: "Licenses", icon: Key },
      { id: "cd_canvases", label: "Canvases", icon: Palette },
      { id: "cd_roles", label: "Roles", icon: Shield },
      { id: "cd_functions", label: "Functions", icon: Workflow },
      { id: "cd_translations", label: "Translations", icon: Languages },
      { id: "cd_components", label: "Components", icon: Boxes },
    ],
  },
  {
    id: "designers",
    label: "Designers",
    color: "#8B5CF6",
    accentColor: "#7C3AED",
    icon: PenTool,
    description: "Design tools",
    items: [
      { id: "db_designer", label: "Database Designer", icon: DatabaseZap },
      { id: "form_designer", label: "Form Designer", icon: Monitor },
      { id: "canvas_designer", label: "Canvas Designer", icon: LayoutDashboard },
      { id: "workflow_designer", label: "Workflow Designer", icon: Workflow },
    ],
  },
];

// ============================================================================
// PLACEHOLDER SCREEN COMPONENT
// ============================================================================
function EntityScreen({ item, group }) {
  const Icon = item.icon;
  return (
    <div style={{ padding: "48px", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: group.color + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={24} color={group.color} strokeWidth={1.5} />
        </div>
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#0F172A",
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            {item.label}
          </h1>
          <span
            style={{
              fontSize: 13,
              color: group.color,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {group.label}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid #E2E8F0",
            background: "#FAFBFC",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button style={toolbarBtnStyle}>+ New</button>
            <button style={{ ...toolbarBtnStyle, background: "transparent", color: "#64748B" }}>
              Filter
            </button>
            <button style={{ ...toolbarBtnStyle, background: "transparent", color: "#64748B" }}>
              Sort
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <Search size={14} color="#94A3B8" />
            <span style={{ fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>
              Search {item.label.toLowerCase()}...
            </span>
          </div>
        </div>

        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 1fr 140px 120px 100px",
            padding: "10px 20px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            fontSize: 12,
            fontWeight: 600,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span></span>
          <span>Name</span>
          <span>Alias</span>
          <span>Status</span>
          <span>Changed</span>
          <span>Owner</span>
        </div>

        {/* Empty State */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            color: "#94A3B8",
          }}
        >
          <Icon size={40} strokeWidth={1} color="#CBD5E1" />
          <p
            style={{
              marginTop: 16,
              fontSize: 15,
              fontFamily: "'DM Sans', sans-serif",
              color: "#94A3B8",
            }}
          >
            No {item.label.toLowerCase()} yet
          </p>
          <button
            style={{
              marginTop: 12,
              padding: "8px 20px",
              border: "none",
              borderRadius: 8,
              background: group.color,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Create first {item.label.toLowerCase().replace(/s$/, "")}
          </button>
        </div>
      </div>
    </div>
  );
}

const toolbarBtnStyle = {
  padding: "6px 14px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  background: "#fff",
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

// ============================================================================
// HOME SCREEN
// ============================================================================
function HomeScreen() {
  return (
    <div style={{ padding: "48px", maxWidth: 1100 }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#0F172A",
          margin: 0,
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "-0.03em",
        }}
      >
        MetalSpheeres
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "#64748B",
          marginTop: 8,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Production management platform
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          marginTop: 40,
        }}
      >
        {menuGroups.map((group) => {
          const GIcon = group.icon;
          return (
            <div
              key={group.id}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "24px",
                background: "#fff",
                transition: "box-shadow 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: group.color + "14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GIcon size={20} color={group.color} strokeWidth={1.5} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#0F172A",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {group.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94A3B8",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {group.description}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {group.items.slice(0, 6).map((item) => (
                  <span
                    key={item.id}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "#F1F5F9",
                      fontSize: 12,
                      color: "#475569",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.label}
                  </span>
                ))}
                {group.items.length > 6 && (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "#F1F5F9",
                      fontSize: 12,
                      color: "#94A3B8",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    +{group.items.length - 6} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SIDEBAR MENU ITEM
// ============================================================================
function SidebarGroup({ group, isExpanded, onToggle, activeItem, onItemClick, collapsed }) {
  const GIcon = group.icon;

  if (collapsed) {
    return (
      <div style={{ marginBottom: 4 }}>
        <div
          title={group.label}
          onClick={onToggle}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            background: isExpanded ? group.color + "18" : "transparent",
            transition: "background 0.15s",
            margin: "0 auto",
          }}
        >
          <GIcon size={18} color={isExpanded ? group.color : "#64748B"} strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 8,
          cursor: "pointer",
          userSelect: "none",
          transition: "background 0.15s",
          background: isExpanded ? group.color + "08" : "transparent",
        }}
      >
        <GIcon size={16} color={group.color} strokeWidth={1.5} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {group.label}
        </span>
        {isExpanded ? (
          <ChevronDown size={14} color="#94A3B8" />
        ) : (
          <ChevronRight size={14} color="#94A3B8" />
        )}
      </div>

      {isExpanded && (
        <div style={{ marginTop: 2, marginLeft: 12, paddingLeft: 14, borderLeft: `2px solid ${group.color}22` }}>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: 7,
                  cursor: "pointer",
                  background: isActive ? group.color + "14" : "transparent",
                  transition: "all 0.15s",
                  marginBottom: 1,
                }}
              >
                <Icon
                  size={15}
                  color={isActive ? group.color : "#94A3B8"}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: isActive ? group.accentColor : "#64748B",
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function MetalSpheeresApp() {
  const [activeItem, setActiveItem] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(["primary"]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
    );
  };

  const findContext = () => {
    for (const group of menuGroups) {
      const item = group.items.find((i) => i.id === activeItem);
      if (item) return { item, group };
    }
    return null;
  };

  const ctx = findContext();

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'DM Sans', sans-serif",
        background: "#F8FAFC",
      }}
    >
      {/* ============ SIDEBAR ============ */}
      <div
        style={{
          width: sidebarCollapsed ? 68 : 260,
          minWidth: sidebarCollapsed ? 68 : 260,
          background: "#FFFFFF",
          borderRight: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s, min-width 0.2s",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: sidebarCollapsed ? "20px 14px" : "20px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #334155 0%, #0F172A 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Circle size={14} color="#fff" fill="#fff" strokeWidth={0} />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0F172A",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                }}
              >
                Metal
                <span style={{ color: "#64748B" }}>Spheeres</span>
              </div>
              <div style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Production Platform
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: sidebarCollapsed ? "12px 8px" : "12px",
          }}
        >
          {/* Home */}
          <div
            onClick={() => setActiveItem(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: sidebarCollapsed ? "10px" : "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background: activeItem === null ? "#F1F5F9" : "transparent",
              marginBottom: 8,
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
            }}
          >
            <LayoutDashboard
              size={16}
              color={activeItem === null ? "#0F172A" : "#64748B"}
              strokeWidth={1.5}
            />
            {!sidebarCollapsed && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: activeItem === null ? 600 : 400,
                  color: activeItem === null ? "#0F172A" : "#64748B",
                }}
              >
                Dashboard
              </span>
            )}
          </div>

          <div
            style={{
              height: 1,
              background: "#E2E8F0",
              margin: sidebarCollapsed ? "8px 4px" : "8px 12px",
            }}
          />

          {menuGroups.map((group) => (
            <SidebarGroup
              key={group.id}
              group={group}
              isExpanded={expandedGroups.includes(group.id)}
              onToggle={() => toggleGroup(group.id)}
              activeItem={activeItem}
              onItemClick={(id) => {
                setActiveItem(id);
                if (!expandedGroups.includes(group.id)) {
                  setExpandedGroups((prev) => [...prev, group.id]);
                }
              }}
              collapsed={sidebarCollapsed}
            />
          ))}
        </div>

        {/* Collapse toggle */}
        <div
          style={{
            padding: "12px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: sidebarCollapsed ? "center" : "flex-end",
          }}
        >
          <div
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: "#F1F5F9",
              transition: "background 0.15s",
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} color="#64748B" /> : <Menu size={16} color="#64748B" />}
          </div>
        </div>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div
          style={{
            height: 56,
            borderBottom: "1px solid #E2E8F0",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {ctx && (
              <>
                <span
                  style={{
                    fontSize: 12,
                    color: "#94A3B8",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontWeight: 500,
                  }}
                >
                  {ctx.group.label}
                </span>
                <ChevronRight size={14} color="#CBD5E1" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                  {ctx.item.label}
                </span>
              </>
            )}
            {!ctx && (
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Dashboard</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
              }}
            >
              <Search size={14} color="#94A3B8" />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Search...</span>
              <span
                style={{
                  fontSize: 11,
                  color: "#CBD5E1",
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 4,
                  padding: "1px 6px",
                  marginLeft: 16,
                }}
              >
                ⌘K
              </span>
            </div>
            <Bell size={18} color="#94A3B8" strokeWidth={1.5} style={{ cursor: "pointer" }} />
            <Settings size={18} color="#94A3B8" strokeWidth={1.5} style={{ cursor: "pointer" }} />
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #334155 0%, #475569 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <CircleUser size={18} color="#fff" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {ctx ? <EntityScreen item={ctx.item} group={ctx.group} /> : <HomeScreen />}
        </div>
      </div>
    </div>
  );
}
