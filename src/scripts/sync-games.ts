import { syncGamesFromCalendar } from "../lib/game-sync";

async function main() {
  const result = await syncGamesFromCalendar();
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
