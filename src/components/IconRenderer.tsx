import React from 'react';
import {
  // Social Media Icons
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Twitch,
  MessageCircle, // Discord
  Send, // Telegram
  Camera, // Snapchat
  Music, // Spotify/Apple Music
  Play, // TikTok/Video
  Rss, // Blog/RSS
  Mail,
  Globe,
  
  // General Icons
  Home,
  User,
  Settings,
  Heart,
  Star,
  Bookmark,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShoppingCart,
  CreditCard,
  Briefcase,
  GraduationCap,
  Camera as CameraIcon,
  Image,
  FileText,
  Download,
  ExternalLink,
  Link,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Social Media
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitch: Twitch,
  discord: MessageCircle,
  telegram: Send,
  snapchat: Camera,
  spotify: Music,
  tiktok: Play,
  blog: Rss,
  email: Mail,
  website: Globe,
  
  // General
  home: Home,
  user: User,
  settings: Settings,
  heart: Heart,
  star: Star,
  bookmark: Bookmark,
  calendar: Calendar,
  clock: Clock,
  'map-pin': MapPin,
  phone: Phone,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  camera: CameraIcon,
  image: Image,
  'file-text': FileText,
  download: Download,
  'external-link': ExternalLink,
  link: Link,
};

interface IconRendererProps {
  iconName?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function IconRenderer({ iconName, className = 'h-4 w-4', fallback }: IconRendererProps) {
  if (!iconName) {
    return fallback ? <>{fallback}</> : null;
  }

  const IconComponent = iconMap[iconName.toLowerCase()];
  
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // If no matching icon found, display the original text as fallback
  return fallback ? <>{fallback}</> : <span className={className}>{iconName}</span>;
} 