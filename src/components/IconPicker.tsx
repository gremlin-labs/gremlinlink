'use client';

import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  
  // Categories
  Search,
  X,
} from 'lucide-react';

interface IconOption {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'social' | 'general';
  label: string;
}

const iconOptions: IconOption[] = [
  // Social Media
  { name: 'github', icon: Github, category: 'social', label: 'GitHub' },
  { name: 'twitter', icon: Twitter, category: 'social', label: 'Twitter/X' },
  { name: 'linkedin', icon: Linkedin, category: 'social', label: 'LinkedIn' },
  { name: 'instagram', icon: Instagram, category: 'social', label: 'Instagram' },
  { name: 'facebook', icon: Facebook, category: 'social', label: 'Facebook' },
  { name: 'youtube', icon: Youtube, category: 'social', label: 'YouTube' },
  { name: 'twitch', icon: Twitch, category: 'social', label: 'Twitch' },
  { name: 'discord', icon: MessageCircle, category: 'social', label: 'Discord' },
  { name: 'telegram', icon: Send, category: 'social', label: 'Telegram' },
  { name: 'snapchat', icon: Camera, category: 'social', label: 'Snapchat' },
  { name: 'spotify', icon: Music, category: 'social', label: 'Spotify' },
  { name: 'tiktok', icon: Play, category: 'social', label: 'TikTok' },
  { name: 'blog', icon: Rss, category: 'social', label: 'Blog/RSS' },
  { name: 'email', icon: Mail, category: 'social', label: 'Email' },
  { name: 'website', icon: Globe, category: 'social', label: 'Website' },
  
  // General
  { name: 'home', icon: Home, category: 'general', label: 'Home' },
  { name: 'user', icon: User, category: 'general', label: 'Profile' },
  { name: 'settings', icon: Settings, category: 'general', label: 'Settings' },
  { name: 'heart', icon: Heart, category: 'general', label: 'Favorites' },
  { name: 'star', icon: Star, category: 'general', label: 'Featured' },
  { name: 'bookmark', icon: Bookmark, category: 'general', label: 'Bookmarks' },
  { name: 'calendar', icon: Calendar, category: 'general', label: 'Calendar' },
  { name: 'clock', icon: Clock, category: 'general', label: 'Schedule' },
  { name: 'map-pin', icon: MapPin, category: 'general', label: 'Location' },
  { name: 'phone', icon: Phone, category: 'general', label: 'Contact' },
  { name: 'shopping-cart', icon: ShoppingCart, category: 'general', label: 'Shop' },
  { name: 'credit-card', icon: CreditCard, category: 'general', label: 'Payment' },
  { name: 'briefcase', icon: Briefcase, category: 'general', label: 'Work' },
  { name: 'graduation-cap', icon: GraduationCap, category: 'general', label: 'Education' },
  { name: 'camera', icon: CameraIcon, category: 'general', label: 'Photos' },
  { name: 'image', icon: Image, category: 'general', label: 'Gallery' },
  { name: 'file-text', icon: FileText, category: 'general', label: 'Documents' },
  { name: 'download', icon: Download, category: 'general', label: 'Downloads' },
  { name: 'external-link', icon: ExternalLink, category: 'general', label: 'External' },
  { name: 'link', icon: Link, category: 'general', label: 'Links' },
];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
}

export function IconPicker({ value, onChange, placeholder = 'Select an icon' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'social' | 'general'>('all');

  const selectedIcon = iconOptions.find(option => option.name === value);

  const filteredIcons = iconOptions.filter(option => {
    const matchesSearch = option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         option.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || option.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
  };

  const clearIcon = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start h-10"
        >
          {selectedIcon ? (
            <div className="flex items-center gap-2">
              <selectedIcon.icon className="h-4 w-4" />
              <span>{selectedIcon.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory('all')}
              className="flex-1"
            >
              All
            </Button>
            <Button
              variant={activeCategory === 'social' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory('social')}
              className="flex-1"
            >
              Social
            </Button>
            <Button
              variant={activeCategory === 'general' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory('general')}
              className="flex-1"
            >
              General
            </Button>
          </div>

          {/* Clear Selection */}
          {selectedIcon && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearIcon}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          )}

          {/* Icons Grid */}
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground">
            {filteredIcons.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {filteredIcons.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = value === option.name;
                  
                  return (
                    <Button
                      key={option.name}
                      variant={isSelected ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleIconSelect(option.name)}
                      className="h-16 flex flex-col items-center justify-center gap-1.5 p-3"
                      title={option.label}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-xs text-center leading-tight max-w-full break-words">
                        {option.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No icons found</p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 