export interface Presenter {
  name: string;
  email: string;
  phone: string;
}

export interface Paper {
  _id: string;
  title: string;
  domain: string;
  paperId: string;
  synopsis: string;
  presenters: Presenter[];
  selectedSlot?: {
    date: string;
    room: string;
    timeSlot: string;
    bookedBy?: string;
  };
} 