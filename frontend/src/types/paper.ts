export interface Presenter {
  name: string;
  email: string;
  phone: string;
}

export interface Paper {
  _id: string;
  domain: string;
  title: string;
  presenters: Presenter[];
  synopsis: string;
  teamId: string;
  room?: string | null;
  timeSlot?: string | null;
  day?: number | null;
  selectedSlot?: {
    date: string;
    room: string;
    timeSlot: string;
    bookedBy: string;
  };
  isSlotAllocated: boolean;
} 