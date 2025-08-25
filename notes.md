npm run dev -- --host
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data

firebase deploy --only functions:addAdminPass