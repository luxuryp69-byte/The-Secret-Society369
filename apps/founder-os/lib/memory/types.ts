export interface FounderProfile {
  name?: string;
  role?: string;
  experience?: string;
}

export interface CompanyProfile {
  name?: string;
  industry?: string;
  stage?: string;
  country?: string;
}

export interface ProductProfile {
  name?: string;
  description?: string;
  pricing?: string;
}

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

export interface Decision {
  id: string;
  decision: string;
  reason?: string;
  date: string;
}

export interface FounderMemory {

  founder: FounderProfile;

  company: CompanyProfile;

  product: ProductProfile;

  goals: Goal[];

  decisions: Decision[];

  knowledge: string[];

  conversations: string[];

  insights: string[];

}
