START
set meet to loadMeet()
set meet name and target lap seconds
set seconds to totalSeconds(meet)
report the meet name and the seconds
set slow to slowRunners(meet, target)
if slow has anything in it
    report the slow runners
otherwise
    report that nobody is slow
set lines to resultLines(meet)
for each line in lines
    put the line on the screen
dropLap(meet, "Ana")
report totalSeconds(meet) and the laps Ana now has
saveMeet(meet)
END
