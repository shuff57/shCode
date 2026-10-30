Problem: Lap Times
Partners:

CONTRACTS (one row per function: name, takes in, gives back)
- makeRunner(name, laps, lapSeconds) gives back one runner
- totalSeconds(meet) gives back laps times lapSeconds added up for the whole list
- slowRunners(meet, target) gives back a NEW list of the runners whose lapSeconds is above the target
- resultLines(meet) gives back one line per runner
- dropLap(meet, name) takes one lap off that runner, never below zero, and changes the list it was handed
- saveMeet(meet) saves the list to storage
- loadMeet() gives the saved list back

PLAN
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
