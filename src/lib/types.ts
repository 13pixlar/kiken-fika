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

/** Matchrad för admin: redigera match och lägga till/ta bort fika-anmälningar (backfill). */
export type AdminGameSignupRow = {
  signupId: number;
  parentId: number;
  parentName: string;
};

export type AdminGameRow = {
  id: number;
  uid: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  isHomeGame: boolean;
  fikaSalesSek: number | null;
  signups: AdminGameSignupRow[];
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
  /** Whole SEK; null if admin has not entered sales yet */
  fikaSalesSek: number | null;
  signups: GameSignup[];
};

/** Administratörskonto (utan känsliga fält), för admin-gränssnittet. */
export type AdminPublicRow = {
  id: number;
  username: string;
  createdAt: string;
};
