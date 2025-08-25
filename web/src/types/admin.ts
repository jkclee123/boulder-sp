import { Timestamp } from 'firebase/firestore';

export interface AdminPass {
  id: string;
  gymDisplayName: string;
  gymId: string;
  passName: string;
  count: number;
  price: number;
  duration: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  gymMemberId?: { [gymId: string]: string };
}
