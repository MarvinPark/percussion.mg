const GREETING_TEMPLATES = [
  "오늘도 일단 가보자고🔥 {name}님",
  "오늘도 출근 완료! 생존 완료! {name}님 🫡",
  "{name}님 등장! 오늘도 레츠고🔥",
  "오늘도 일잘러 모드 ON! {name}님 😎",
  "{name}님 출격 준비 완료! 🚀",
  "오늘도 뭔가 잘될 것 같은데? {name}님 ✨",
  "{name}님, 오늘도 폼 미쳤다 🤩",
  "오늘도 대충 말고 제대로! {name}님 💪",
  "{name}님 왔다! 업무도 왔다! 📋",
  "{name}님 오늘도 일하러 왔구나? 😂",
  "{name}님, 오늘의 미션이 도착했습니다! 🎯",
  "{name}님! 업무가 당신을 기다립니다. 👀",
  "{name}님 오늘도 화이팅이다 이말이야 🔥",
  "{name}님 오늘도 레벨업 가즈아 📈",
  "{name}님, 오늘도 퀘스트 시작! 🎮",
  "{name}님! 오늘도 대박각? 💰",
  "{name}님 오늘도 폼 미쳤다 🫡",
  "{name}님 오늘도 GOAT 모드 ON 🐐",
  "{name}님 오늘도 일잘러 그 자체 🧠",
  "{name}님 오늘도 텐션 UP ⚡",
  "{name}님, 오늘 업무도 찢어보자 🔨",
  "{name}님 오늘도 순조로운 출발 🌈",
  "{name}님 오늘도 완전 럭키비키잖아🍀",
  "{name}님, 오늘도 느낌 온다 🔮",
] as const;

const GREETING_COLOR_CLASSES = [
  "text-blue-600 dark:text-blue-400",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-rose-600 dark:text-rose-400",
  "text-amber-600 dark:text-amber-500",
  "text-cyan-600 dark:text-cyan-400",
  "text-orange-600 dark:text-orange-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-teal-600 dark:text-teal-400",
  "text-red-600 dark:text-red-400",
  "text-lime-700 dark:text-lime-400",
  "text-sky-600 dark:text-sky-400",
  "text-pink-600 dark:text-pink-400",
] as const;

export function pickRandomDashboardGreeting(displayName: string): string {
  const index = Math.floor(Math.random() * GREETING_TEMPLATES.length);
  return GREETING_TEMPLATES[index]!.replaceAll("{name}", displayName);
}

export function pickRandomGreetingColorClass(): string {
  const index = Math.floor(Math.random() * GREETING_COLOR_CLASSES.length);
  return GREETING_COLOR_CLASSES[index]!;
}

export function pickRandomDashboardGreetingStyle(displayName: string): {
  greeting: string;
  colorClass: string;
} {
  return {
    greeting: pickRandomDashboardGreeting(displayName),
    colorClass: pickRandomGreetingColorClass(),
  };
}
