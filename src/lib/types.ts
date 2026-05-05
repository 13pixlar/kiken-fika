export type ParentOption = {
  id: number;
  name: string;
};

export type AdminFikaSignup = {
  signupId: number;
  gameId: number;
  startsAt: string;
  title: string;
};

export type AdminParentRow = ParentOption & {
  signups: AdminFikaSignup[];
};

export type GameSignup = {
  id: number;
  parentId: number;
  parentName: string;
};

export type GameRow = {
  id: number;
  uid: string;
  title: string;
  location: string | null;
  startsAt: string | Date;
  endsAt: string | Date | null;
  isHomeGame: boolean;
  signups: GameSignup[];
};
