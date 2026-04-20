export interface AnnouncementCTA {
  label: string;
  action: 'navigate' | 'dismiss' | 'open_url';
  route?: string;
  url?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  frequency: 'once' | 'every_login' | 'daily' | 'weekly' | 'first_login';
  priority: number;
  cta_buttons: AnnouncementCTA[];
  expires_at: string | null;
  created_at: string;
}
