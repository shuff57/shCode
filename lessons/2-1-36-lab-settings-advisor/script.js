// 2.1.37 Print Settings Advisor

// STEP 1: Create filamentType ("PLA", "PETG", or "ABS")
//         and layerHeight (a number of millimeters, e.g. 0.2).

// STEP 2: Write an else if chain on filamentType:
//           "PLA"  -> 200
//           "PETG" -> 235
//           "ABS"  -> 250
//           anything else -> log "Unknown filament type"
//         Log the recommended temperature.

// STEP 3: Add a separate if statement using && or || that warns
//         when layerHeight is outside a safe range
//         (for example, less than 0.1 or greater than 0.4).
