export type EventType = "wedding" | "birthday" | "graduation";

export type EventTypeConfig = {
  value: EventType;
  label: string;
  icon: string;
  /** Small uppercase line on the create screen. */
  eyebrow: string;
  /** Label above the host / celebrant field. */
  hostLabel: string;
  hostPlaceholder: string;
  hostHelper: string;
  /** True when the host field needs two names separated by "&". */
  needsPair: boolean;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  /** "Contribution" wording: wedding = michango, others = gifts / support. */
  contributionLabel: string;
  /** Public invitation page. */
  inviteEyebrow: string;
  inviteQuestion: string;
};

export const EVENT_TYPES: EventTypeConfig[] = [
  {
    value: "wedding",
    label: "Wedding",
    icon: "💍",
    eyebrow: "A NEW CHAPTER",
    hostLabel: "COUPLE NAMES",
    hostPlaceholder: "John & Mary",
    hostHelper: "Separate the two names with '&', for example John & Mary.",
    needsPair: true,
    namePlaceholder: "Wedding Ceremony",
    descriptionPlaceholder: "Tell guests about the celebration",
    contributionLabel: "TARGET CONTRIBUTION · TSH",
    inviteEyebrow: "YOU’RE INVITED TO THE WEDDING OF",
    inviteQuestion: "Will you attend?",
  },
  {
    value: "birthday",
    label: "Birthday",
    icon: "🎂",
    eyebrow: "TIME TO CELEBRATE",
    hostLabel: "BIRTHDAY PERSON",
    hostPlaceholder: "Amina",
    hostHelper: "The name of the person celebrating their birthday.",
    needsPair: false,
    namePlaceholder: "Amina's 25th Birthday Party",
    descriptionPlaceholder: "Theme, dress code, or anything guests should know",
    contributionLabel: "GIFT / CONTRIBUTION TARGET · TSH",
    inviteEyebrow: "YOU’RE INVITED TO CELEBRATE",
    inviteQuestion: "Will you join the party?",
  },
  {
    value: "graduation",
    label: "Graduation",
    icon: "🎓",
    eyebrow: "A PROUD MOMENT",
    hostLabel: "GRADUATE",
    hostPlaceholder: "Juma",
    hostHelper: "The name of the graduate.",
    needsPair: false,
    namePlaceholder: "Juma's Graduation Party",
    descriptionPlaceholder: "Course, university, or anything guests should know",
    contributionLabel: "GIFT / CONTRIBUTION TARGET · TSH",
    inviteEyebrow: "YOU’RE INVITED TO CELEBRATE THE GRADUATION OF",
    inviteQuestion: "Will you join the celebration?",
  },
];

export function getEventTypeConfig(value: string | undefined | null): EventTypeConfig {
  return EVENT_TYPES.find((type) => type.value === value) ?? EVENT_TYPES[0];
}
