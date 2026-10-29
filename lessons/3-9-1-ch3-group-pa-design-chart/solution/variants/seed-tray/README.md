Problem: Seed Tray
Partners:

CONTRACTS (one row per function: name, takes in, gives back)
- makeVariety(variety, packets, seedsPerPacket) gives back one variety
- totalSeeds(tray) gives back packets times seedsPerPacket added up for the whole list
- lowPackets(tray, level) gives back a NEW list of the varieties with packets below the level
- labelLines(tray) gives back one line per variety
- sowPacket(tray, variety) lowers that variety's packets by one, never below zero, and changes the list it was handed
- saveTray(tray) saves the list to storage
- loadTray() gives the saved list back

PLAN
START
set tray to loadTray()
set tray label and level
set seeds to totalSeeds(tray)
report the tray label and the seeds
set low to lowPackets(tray, level)
if low has anything in it
    report the low-packet varieties
otherwise
    report that every variety is stocked
set labels to labelLines(tray)
for each label in labels
    put the label on the screen
sowPacket(tray, "Basil")
report totalSeeds(tray) and the packets Basil now has
saveTray(tray)
END
