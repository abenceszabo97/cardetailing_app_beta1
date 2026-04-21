/**
 * Unified status color system for X-CLEAN admin
 * foglalt=blue, folyamatban=amber, kesz=green, lemondva=red, nem_jott_el=grey, visszaigazolva=blue
 */

export const STATUS_CONFIG = {
  foglalt:         { label: "Foglalt",          bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  visszaigazolva:  { label: "Visszaigazolva",   bg: "bg-blue-500/20",   text: "text-blue-300",   border: "border-blue-500/30",   dot: "bg-blue-300" },
  folyamatban:     { label: "Folyamatban",      bg: "bg-amber-500/20",  text: "text-amber-400",  border: "border-amber-500/30",  dot: "bg-amber-400" },
  kesz:            { label: "Kész",             bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30",  dot: "bg-green-400" },
  lemondva:        { label: "Lemondva",         bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  lemondta:        { label: "Lemondva",         bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  nem_jott_el:     { label: "Nem jött el",      bg: "bg-slate-500/20",  text: "text-slate-400",  border: "border-slate-700",     dot: "bg-slate-500" },
  torolt:          { label: "Törölve",          bg: "bg-red-900/20",    text: "text-red-600",    border: "border-red-900/30",    dot: "bg-red-700" },
  // Invoice payment statuses
  fizetve:         { label: "Fizetve",          bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30",  dot: "bg-green-400" },
  fizetesre_var:   { label: "Fizetésre vár",    bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
};

export const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || { label: status, bg: "bg-slate-700/20", text: "text-slate-400", border: "border-slate-700", dot: "bg-slate-500" };

/** Inline badge component — renders as a span, zero deps */
export const StatusBadge = ({ status, size = "sm", className = "" }) => {
  const cfg = getStatusConfig(status);
  const sizeClass = size === "xs" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};
