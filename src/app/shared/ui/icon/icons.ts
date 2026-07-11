/* Icon registry — maps our stable app icon names to Lucide icon data.
   Lucide gives clean, consistent outline icons; swapping a glyph is a one-line
   change here and every `<app-icon>` usage updates at once. */

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Blocks,
  Building2,
  Calendar,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  EllipsisVertical,
  Eye,
  FileCheck,
  Filter,
  HelpCircle,
  Home,
  Info,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  type LucideIconData,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Mic,
  Minus,
  Network,
  Package,
  Flag,
  Gauge,
  Navigation,
  PanelLeft,
  Percent,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Route,
  Search,
  Send,
  Star,
  Settings,
  Share2,
  ShieldCheck,
  Signature,
  Sparkles,
  Truck,
  Upload,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-angular';

export type IconName =
  | 'home'
  | 'dashboard'
  | 'package'
  | 'users'
  | 'truck'
  | 'map-pin'
  | 'wallet'
  | 'report'
  | 'settings'
  | 'integrations'
  | 'signature'
  | 'search'
  | 'bell'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-left'
  | 'arrow-right'
  | 'plus'
  | 'x'
  | 'check'
  | 'phone'
  | 'share'
  | 'download'
  | 'menu'
  | 'sidebar'
  | 'pin'
  | 'messages'
  | 'support'
  | 'sparkles'
  | 'filter'
  | 'calendar'
  | 'grid'
  | 'car'
  | 'shield'
  | 'building'
  | 'receipt'
  | 'network'
  | 'user'
  | 'logout'
  | 'mic'
  | 'send'
  | 'clock'
  | 'percent'
  | 'file-check'
  | 'more-vertical'
  | 'eye'
  | 'copy'
  | 'upload'
  | 'link'
  | 'minus'
  | 'info'
  | 'navigation'
  | 'gauge'
  | 'flag'
  | 'route'
  | 'refresh-cw'
  | 'star';

export const ICONS: Record<IconName, LucideIconData> = {
  home: Home,
  dashboard: LayoutDashboard,
  package: Package,
  users: Users,
  truck: Truck,
  'map-pin': MapPin,
  wallet: Wallet,
  report: BarChart3,
  settings: Settings,
  integrations: Blocks,
  signature: Signature,
  search: Search,
  bell: Bell,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  plus: Plus,
  x: X,
  check: Check,
  phone: Phone,
  share: Share2,
  download: Download,
  menu: Menu,
  sidebar: PanelLeft,
  pin: MapPin,
  messages: MessageSquare,
  support: HelpCircle,
  sparkles: Sparkles,
  filter: Filter,
  calendar: Calendar,
  grid: LayoutGrid,
  car: CarFront,
  shield: ShieldCheck,
  building: Building2,
  receipt: Receipt,
  network: Network,
  user: User,
  logout: LogOut,
  mic: Mic,
  send: Send,
  clock: Clock,
  percent: Percent,
  'file-check': FileCheck,
  'more-vertical': EllipsisVertical,
  eye: Eye,
  copy: Copy,
  upload: Upload,
  link: Link2,
  minus: Minus,
  info: Info,
  navigation: Navigation,
  gauge: Gauge,
  flag: Flag,
  route: Route,
  'refresh-cw': RefreshCw,
  star: Star,
};
