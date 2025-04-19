const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwaXveNcyDoqfH6O0zuUK9brNGpBF2iXdsr2Ps5K9aMqdfwRzJBu9Cx-2j4HlkkpVPB/exec';

const muscleGroups = {
  Legs: [
    "Hip Abduction Machine", "Hip Adduction Machine", "Calf Raise", "Hack Squat Calf Raise", "Hyperextension",
    "Dumbbell Stiff Leg Deadlift", "Seated Leg Curl", "Reverse Hack Squat", "Lying Leg Curl", "Dumbbell Goblet Squat",
    "Barbell Back Squat", "Leg Press", "Leg Extension", "Dumbbell Bulgarian Squat", "Dumbbell Lunge", "Machine Hack Squat",
    "Bodyweight Walking Lunge", "Smith Machine Squat", "Bodyweight Squat Jump", "Bodyweight Wall Squat", "Sled Push", "Other…"
  ],
  Shoulders: [
    "Lateral Raise", "Seated Dumbbell Press", "Overhead Press", "Standing Dumbbell Shoulder Press", "Seated Arnold Press",
    "Seated Bent Over Dumbbell Reverse Fly", "Cable Face Pull", "Machine Reverse Fly", "Standing Dumbbell Front Raise",
    "Machine Shoulder Press", "Cable Upright Row", "Weight Plate Front Raise", "Standing Arnold Press", "Dumbbell 6 Ways", "Other…"
  ],
  Biceps: [
    "Hammer Curl", "Dumbbell Curl", "Incline Dumbbell Curl", "EZ Bar Preacher Curl", "Barbell Preacher Curl",
    "EZ Bar Curl", "Cable Curl", "Alternating Standing Dumbbell Curl", "Dumbbell Preacher Curl",
    "Alternating Standing Hammer Curl", "Close Grip EZ Bar Curl", "Cable Hammer Curl (Rope Extension)", "Other…"
  ],
  Forearm: [
    "Behind-The-Back Barbell Wrist Curl", "Seated Barbell Wrist Curl", "Reverse Grip Cable Curl",
    "Seated Neutral Grip Dumbbell Wrist Curl", "Reverse Grip Machine", "Neutral Grip Machine", "Other…"
  ],
  Triceps: [
    "Straight Bar Tricep Extension", "Seated Dumbbell Tricep Extension", "Lying Dumbbell Extension", "EZ Bar Skullcrusher",
    "Rope Tricep Extension", "Bent Over Dumbbell Tricep Kickback", "One-Arm Standing Dumbbell Extension",
    "Two Arm Standing Dumbbell Extension", "High Pulley Overhead Tricep Extension", "Low Pulley Overhead Tricep Extension",
    "Single Bench Dip", "Cable Kickbacks", "Other…"
  ],
  Chest: [
    "Bench Press", "Incline Bench Press", "Decline Bench Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Dumbbell Press",
    "Dumbbell Chest Fly", "Standing Cable Fly", "Decline Cable Fly", "High Cable Fly", "Machine Chest Fly", "Pushup",
    "Dumbbell Pullover", "Close Grip Dumbbell Press", "Other…"
  ],
  Back: [
    "Lat Pull Down", "Wide Grip Pull Up", "V-Bar Pull Down", "Underhand Close Grip Lateral Pulldown",
    "Behind Neck Lat Pull Down", "Deadlift", "Seated Cable Row", "Machine T-Bar Row", "Dumbbell Row", "T-Bar Row",
    "Machine Row", "Other…"
  ]
};


let workoutData = JSON.parse(localStorage.getItem('workouts')) || [];

document.addEventListener('DOMContentLoaded', () => {
  const muscleGroupSelect = document.getElementById('muscleGroup');
  const exerciseSelect = document.getElementById('exercise');
  const customExercise = document.getElementById('customExercise');
  const workoutForm = document.getElementById('workoutForm');
  const historyTable = document.getElementById('historyTable');
  const chartSelector = document.getElementById('chartExerciseSelector');
  const chartCanvas = document.getElementById('progressChart');
  let chart;

  const defaultOption = new Option('Select Muscle Group', '', true, true);
  defaultOption.disabled = true;
  muscleGroupSelect.add(defaultOption);
  Object.keys(muscleGroups).forEach(group => {
    const option = new Option(group, group);
    muscleGroupSelect.add(option);
  });

  chartSelector.innerHTML = '';
  const defaultChartOption = new Option('Select Exercise', '', true, true);
  defaultChartOption.disabled = true;
  chartSelector.add(defaultChartOption);

  muscleGroupSelect.addEventListener('change', () => {
    updateExerciseDropdown(muscleGroupSelect.value);
  });

  exerciseSelect.addEventListener('change', () => {
    customExercise.classList.toggle('hidden', exerciseSelect.value !== 'Other…');
  });

  function updateExerciseDropdown(group) {
    exerciseSelect.innerHTML = '';
    const defaultExerciseOption = new Option('Select Exercise', '', true, true);
    defaultExerciseOption.disabled = true;
    exerciseSelect.add(defaultExerciseOption);
    muscleGroups[group].forEach(ex => {
      exerciseSelect.add(new Option(ex, ex));
    });
    customExercise.classList.add('hidden');
  }

  function saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(workoutData));
  }

  function getExerciseName() {
    return exerciseSelect.value === 'Other…' ? customExercise.value : exerciseSelect.value;
  }

  function formatSets(sets) {
    return sets.map(([r, w]) => `${r}x${w}`).join(', ');
  }

  function isPR(entry) {
    const weights = workoutData
      .filter(w => w.exercise === entry.exercise)
      .map(w => Math.max(...w.sets.map(s => Number(s[1] || 0))));
    return Math.max(...weights) === Math.max(...entry.sets.map(s => Number(s[1] || 0)));
  }

  function renderHistory() {
    historyTable.innerHTML = '';
    workoutData.forEach((entry, idx) => {
      const row = historyTable.insertRow();
      row.classList.add('animate-fade-in');
      row.innerHTML = `
        <td class="p-1">${new Date(entry.timestamp).toLocaleString()}</td>
        <td>${entry.muscle}</td>
        <td class="${isPR(entry) ? 'text-green-600 font-bold' : ''}">${entry.exercise}</td>
        <td>${formatSets(entry.sets)}</td>
        <td>${entry.notes}</td>
        <td>${entry.synced ? '✅ Synced' : '<span class="text-yellow-500">Pending</span>'}</td>
        <td><button class="text-blue-500" onclick="editEntry(${idx})">✏️</button></td>
        <td><button class="text-red-500" onclick="deleteEntry(${idx})">🗑️</button></td>
      `;
    });

    updateChartSelector();
  }

  function updateChartSelector() {
    const uniqueExercises = [...new Set(workoutData.map(w => w.exercise))];
    chartSelector.innerHTML = '';
    const defaultChartOption = new Option('Select Exercise', '', true, true);
    defaultChartOption.disabled = true;
    chartSelector.add(defaultChartOption);
    uniqueExercises.forEach(ex => chartSelector.add(new Option(ex, ex)));
  }

  chartSelector.addEventListener('change', () => {
    if (!chartSelector.value) return;

    const data = workoutData
      .filter(w => w.exercise === chartSelector.value)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
    const weights = data.map(d => Math.max(...d.sets.map(s => parseFloat(s[1]))));

    if (chart) chart.destroy();
    chart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: chartSelector.value,
          data: weights,
          borderColor: 'green',
          fill: false,
          tension: 0.2
        }]
      },
      options: { responsive: true }
    });
  });

  workoutForm.addEventListener('submit', async e => {
    e.preventDefault();

    const entry = {
      timestamp: new Date().toISOString(),
      muscle: muscleGroupSelect.value,
      exercise: getExerciseName(),
      sets: [
        [set1Reps.value, set1Weight.value],
        [set2Reps.value, set2Weight.value],
        [set3Reps.value, set3Weight.value],
        [set4Reps.value, set4Weight.value]
      ],
      notes: notes.value,
      synced: false
    };

    workoutData.push(entry);
    saveWorkouts();
    renderHistory();
    workoutForm.reset();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    try {
      await sendToSheet(entry);
      entry.synced = true;
      saveWorkouts();
      renderHistory();
    } catch {
      console.warn('Offline or sheet sync error');
    }
  });

  async function sendToSheet(entry) {
    const formBody = `data=${encodeURIComponent(JSON.stringify(entry))}`;

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody
      });

      const result = await response.json();
      console.log("✅ Synced with Google Sheet:", result);
      return result;

    } catch (err) {
      console.error("❌ Failed to sync with Google Sheet:", err);
      return { status: 'error', message: err.message };
    }
  }

  function syncPending() {
    workoutData.forEach(async (entry, idx) => {
      if (!entry.synced) {
        try {
          await sendToSheet(entry);
          entry.synced = true;
          saveWorkouts();
          renderHistory();
        } catch {}
      }
    });
  }

  window.editEntry = function (idx) {
    const entry = workoutData[idx];
    muscleGroupSelect.value = entry.muscle;
    updateExerciseDropdown(entry.muscle);
    if (muscleGroups[entry.muscle].includes(entry.exercise)) {
      exerciseSelect.value = entry.exercise;
    } else {
      exerciseSelect.value = 'Other…';
      customExercise.value = entry.exercise;
      customExercise.classList.remove('hidden');
    }
    [set1Reps.value, set1Weight.value] = entry.sets[0];
    [set2Reps.value, set2Weight.value] = entry.sets[1];
    [set3Reps.value, set3Weight.value] = entry.sets[2];
    [set4Reps.value, set4Weight.value] = entry.sets[3];
    notes.value = entry.notes;
    workoutData.splice(idx, 1);
    saveWorkouts();
    renderHistory();
  }

  window.deleteEntry = function (idx) {
    workoutData.splice(idx, 1);
    saveWorkouts();
    renderHistory();
  }

  renderHistory();
  syncPending();
});
// let workoutData = JSON.parse(localStorage.getItem('workouts')) || [];

// document.addEventListener('DOMContentLoaded', () => {
//   const muscleGroupSelect = document.getElementById('muscleGroup');
//   const exerciseSelect = document.getElementById('exercise');
//   const customExercise = document.getElementById('customExercise');
//   const workoutForm = document.getElementById('workoutForm');
//   const historyTable = document.getElementById('historyTable');
//   const chartSelector = document.getElementById('chartExerciseSelector');
//   const chartCanvas = document.getElementById('progressChart');
//   let chart;

//   // Populate muscle groups
//   Object.keys(muscleGroups).forEach(group => {
//     const option = new Option(group, group);
//     muscleGroupSelect.add(option);
//   });

//   muscleGroupSelect.addEventListener('change', () => {
//     updateExerciseDropdown(muscleGroupSelect.value);
//   });

//   exerciseSelect.addEventListener('change', () => {
//     customExercise.classList.toggle('hidden', exerciseSelect.value !== 'Other…');
//   });

//   function updateExerciseDropdown(group) {
//     exerciseSelect.innerHTML = '';
//     muscleGroups[group].forEach(ex => {
//       exerciseSelect.add(new Option(ex, ex));
//     });
//     customExercise.classList.add('hidden');
//   }

//   function saveWorkouts() {
//     localStorage.setItem('workouts', JSON.stringify(workoutData));
//   }

//   function getExerciseName() {
//     return exerciseSelect.value === 'Other…' ? customExercise.value : exerciseSelect.value;
//   }

//   function formatSets(sets) {
//     return sets.map(([r, w]) => `${r}x${w}`).join(', ');
//   }

//   function isPR(entry) {
//     const weights = workoutData
//       .filter(w => w.exercise === entry.exercise)
//       .map(w => Math.max(...w.sets.map(s => Number(s[1] || 0))));
//     return Math.max(...weights) === Math.max(...entry.sets.map(s => Number(s[1] || 0)));
//   }

//   function renderHistory() {
//     historyTable.innerHTML = '';
//     workoutData.forEach((entry, idx) => {
//       const row = historyTable.insertRow();
//       row.innerHTML = `
//         <td class="p-1">${new Date(entry.timestamp).toLocaleString()}</td>
//         <td>${entry.muscle}</td>
//         <td class="${isPR(entry) ? 'text-green-600 font-bold' : ''}">${entry.exercise}</td>
//         <td>${formatSets(entry.sets)}</td>
//         <td>${entry.notes}</td>
//         <td>${entry.synced ? '✅ Synced' : '<span class="text-yellow-500">Pending</span>'}</td>
//         <td><button class="text-blue-500" onclick="editEntry(${idx})">✏️</button></td>
//         <td><button class="text-red-500" onclick="deleteEntry(${idx})">🗑️</button></td>
//       `;
//     });

//     updateChartSelector();
//   }

//   function updateChartSelector() {
//     const uniqueExercises = [...new Set(workoutData.map(w => w.exercise))];
//     chartSelector.innerHTML = '';
//     uniqueExercises.forEach(ex => chartSelector.add(new Option(ex, ex)));
//   }

//   chartSelector.addEventListener('change', () => {
//     const data = workoutData
//       .filter(w => w.exercise === chartSelector.value)
//       .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

//     const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
//     const weights = data.map(d => Math.max(...d.sets.map(s => Number(s[1]))));

//     if (chart) chart.destroy();
//     chart = new Chart(chartCanvas, {
//       type: 'line',
//       data: {
//         labels,
//         datasets: [{
//           label: chartSelector.value,
//           data: weights,
//           borderColor: 'green',
//           fill: false,
//           tension: 0.2
//         }]
//       },
//       options: { responsive: true }
//     });
//   });

//   workoutForm.addEventListener('submit', async e => {
//     e.preventDefault();

//     const entry = {
//       timestamp: new Date().toISOString(),
//       muscle: muscleGroupSelect.value,
//       exercise: getExerciseName(),
//       sets: [
//         [set1Reps.value, set1Weight.value],
//         [set2Reps.value, set2Weight.value],
//         [set3Reps.value, set3Weight.value],
//         [set4Reps.value, set4Weight.value]
//       ],
//       notes: notes.value,
//       synced: false
//     };

//     workoutData.push(entry);
//     saveWorkouts();
//     renderHistory();
//     workoutForm.reset();
//     window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

//     try {
//       await sendToSheet(entry);
//       entry.synced = true;
//       saveWorkouts();
//       renderHistory();
//     } catch {
//       console.warn('Offline or sheet sync error');
//     }
//   });

//   async function sendToSheet(entry) {
//     const formBody = `data=${encodeURIComponent(JSON.stringify(entry))}`;
    
//     try {
//       const response = await fetch(SHEET_API_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         },
//         body: formBody
//       });
  
//       const result = await response.json();
//       console.log("✅ Synced with Google Sheet:", result);
//       return result;
  
//     } catch (err) {
//       console.error("❌ Failed to sync with Google Sheet:", err);
//       return { status: 'error', message: err.message };
//     }
//   }
  

//   function syncPending() {
//     workoutData.forEach(async (entry, idx) => {
//       if (!entry.synced) {
//         try {
//           await sendToSheet(entry);
//           entry.synced = true;
//           saveWorkouts();
//           renderHistory();
//         } catch {}
//       }
//     });
//   }

//   window.editEntry = function (idx) {
//     const entry = workoutData[idx];
//     muscleGroupSelect.value = entry.muscle;
//     updateExerciseDropdown(entry.muscle);
//     if (muscleGroups[entry.muscle].includes(entry.exercise)) {
//       exerciseSelect.value = entry.exercise;
//     } else {
//       exerciseSelect.value = 'Other…';
//       customExercise.value = entry.exercise;
//       customExercise.classList.remove('hidden');
//     }
//     [set1Reps.value, set1Weight.value] = entry.sets[0];
//     [set2Reps.value, set2Weight.value] = entry.sets[1];
//     [set3Reps.value, set3Weight.value] = entry.sets[2];
//     [set4Reps.value, set4Weight.value] = entry.sets[3];
//     notes.value = entry.notes;
//     workoutData.splice(idx, 1);
//     saveWorkouts();
//     renderHistory();
//   }

//   window.deleteEntry = function (idx) {
//     workoutData.splice(idx, 1);
//     saveWorkouts();
//     renderHistory();
//   }

//   renderHistory();
//   syncPending();
// });
