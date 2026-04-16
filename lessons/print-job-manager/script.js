// Print Job Manager — Q1 Capstone Project
// Write your code below

// Step 1: Create an empty array called "jobQueue" to hold print jobs.
//         Each job should be an object with: { name, priority, timestamp }

// Step 2: Create a function called "addJob" that takes a document name
//         and priority ("normal" or "high"), creates a job object, and
//         adds it to the jobQueue array.
//         High priority jobs should go to the front of the queue.
//         After adding, call displayQueue() to update the page.

// Step 3: Create a function called "processJob" that removes and
//         "prints" the first job in the queue.
//         Log the processed job to the console.
//         After processing, call displayQueue() to update the page.

// Step 4: Create a function called "displayQueue" that updates the
//         HTML to show all current jobs in the queue.
//         Use getElementById or querySelector to find the #queue element
//         and update its innerHTML.

// Step 5: Handle edge cases:
//         - What if the user tries to add a job with no name?
//         - What if processJob is called when the queue is empty?

// Step 6: Make sure the display shows the job name and priority
//         for each item in the queue.
