START
set tray label and level
set tray to loadTray()
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
