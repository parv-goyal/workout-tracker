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
    "Machine Shoulder Press", "Cable Upright Row", "Weight Plate Front Raise", "Standing Arnold Press", "Dumbbell 6 Ways", "Front Raise", "Shrugs", "Other…"
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
    "Straight Bar Tricep Extension", "Seated Dumbbell Tricep Extension", "Lying Dumbbell Extension", "Skullcrusher",
    "Rope Tricep Extension", "Bent Over Dumbbell Tricep Kickback", "One-Arm Standing Dumbbell Extension",
    "Two Arm Standing Dumbbell Extension", "High Pulley Overhead Tricep Extension", "Low Pulley Overhead Tricep Extension",
    "Single Bench Dip", "Cable Kickbacks", "Single Arm Dumbbell Overhead", "Dumbbell Overhead", "Triceps Pushdown", "Other…"
  ],
  Chest: [
    "Bench Press", "Incline Bench Press", "Decline Bench Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Dumbbell Press",
    "Dumbbell Chest Fly", "Standing Cable Fly", "Decline Cable Fly", "High Cable Fly", "Machine Chest Fly", "Pushup",
    "Dumbbell Pullover", "Close Grip Dumbbell Press", "Other…"
  ],
  Back: [
    "Lat Pull Down", "Wide Grip Pull Up", "V-Bar Pull Down", "Underhand Close Grip Lateral Pulldown",
    "Behind Neck Lat Pull Down", "Deadlift", "Seated Cable Row", "Machine T-Bar Row", "Dumbbell Row", "T-Bar Row",
    "Machine Row", "Upper Back Cable Row", "Reverse Grip Lat Pull Down", "Other…"
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
  const todayVolumeEl = document.getElementById('todayVolume');
  const weekVolumeEl = document.getElementById('weekVolume');
  const prVolumeMsg = document.getElementById('prVolumeMsg');
  let chart;

  const defaultOption = new Option('Select Muscle Group', '', true, true);
  defaultOption.disabled = true;
  muscleGroupSelect.add(defaultOption);
  Object.keys(muscleGroups).forEach(group => muscleGroupSelect.add(new Option(group, group)));

  chartSelector.innerHTML = '';
  const defaultChartOption = new Option('Select Exercise or Volume', '', true, true);
  defaultChartOption.disabled = true;
  chartSelector.add(defaultChartOption);

  muscleGroupSelect.addEventListener('change', () => updateExerciseDropdown(muscleGroupSelect.value));
  exerciseSelect.addEventListener('change', () => customExercise.classList.toggle('hidden', exerciseSelect.value !== 'Other…'));

  function updateExerciseDropdown(group) {
    exerciseSelect.innerHTML = '<option disabled selected>Select Exercise</option>';
    muscleGroups[group].forEach(ex => exerciseSelect.add(new Option(ex, ex)));
    customExercise.classList.add('hidden');
  }

  function saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(workoutData));
  }

  function getExerciseName() {
    return exerciseSelect.value === 'Other…' ? customExercise.value : exerciseSelect.value;
  }

  function calculateVolume(sets) {
    return sets.reduce((sum, [reps, weight]) => {
      return sum + ((+reps || 0) * (+weight || 0));
    }, 0);
  }

  function getMaxVolume() {
    return Math.max(...workoutData.map(e => e.volume || 0), 0);
  }

  function formatSets(sets) {
    return sets.map(([r, w]) => `${r}x${w}`).join(', ');
  }

  function isPR(entry) {
    const weights = workoutData.filter(w => w.exercise === entry.exercise).map(w => Math.max(...w.sets.map(s => +s[1] || 0)));
    return Math.max(...weights) === Math.max(...entry.sets.map(s => +s[1] || 0));
  }

  function updateVolumeSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 6);
    thisWeekStart.setHours(0, 0, 0, 0);

    let todayVolume = 0;
    let weekVolume = 0;
    let maxVolume = getMaxVolume();
    let prHit = false;

    workoutData.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      const entryDay = entry.timestamp.slice(0, 10);
      const volume = entry.volume || 0;

      if (entryDay === today) todayVolume += volume;
      if (entryDate >= thisWeekStart) weekVolume += volume;
      if (volume === maxVolume && entryDay === today) prHit = true;
    });

    todayVolumeEl.textContent = todayVolume.toFixed(1);
    weekVolumeEl.textContent = weekVolume.toFixed(1);
    prVolumeMsg.textContent = prHit ? '🔥 New Personal Record Volume Today!' : '';
  }

  function renderHistory() {
    const maxVolume = getMaxVolume();
    historyTable.innerHTML = '';
    workoutData.forEach((entry, idx) => {
      const row = historyTable.insertRow();
      row.classList.add('animate-fade-in');

      const isVolumePR = entry.volume === maxVolume;

      row.innerHTML = `
        <td class="p-1">${new Date(entry.timestamp).toLocaleString()}</td>
        <td>${entry.muscle}</td>
        <td class="${isPR(entry) ? 'text-green-600 font-bold' : ''}">${entry.exercise}</td>
        <td>${formatSets(entry.sets)}</td>
        <td>${entry.notes}</td>
        <td>${entry.volume || 0} ${isVolumePR ? '<span class="text-green-500 font-semibold">🏆 PR Volume</span>' : ''}</td>
        <td>${entry.synced ? '✅ Synced' : '<span class="text-yellow-500">Pending</span>'}</td>
        <td><button class="text-blue-500" onclick="editEntry(${idx})">✏️</button></td>
        <td><button class="text-red-500" onclick="deleteEntry(${idx})">🗑️</button></td>
      `;
    });

    updateChartSelector();
    updateVolumeSummary();
  }

  function updateChartSelector() {
    const uniqueExercises = [...new Set(workoutData.map(w => w.exercise))];
    chartSelector.innerHTML = '';
    chartSelector.add(new Option('Select Exercise or Volume', '', true, true));
    uniqueExercises.forEach(ex => chartSelector.add(new Option(ex, ex)));
    chartSelector.add(new Option('📊 Volume Over Time', 'volume'));
  }

  chartSelector.addEventListener('change', () => {
    if (!chartSelector.value) return;
    if (chart) chart.destroy();

    if (chartSelector.value === 'volume') {
      const grouped = {};
      workoutData.forEach(w => {
        const day = new Date(w.timestamp).toLocaleDateString();
        grouped[day] = (grouped[day] || 0) + (w.volume || 0);
      });

      const labels = Object.keys(grouped);
      const data = Object.values(grouped);
      const maxVolume = Math.max(...data);

      chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Total Daily Volume',
            data,
            backgroundColor: data.map(v => v === maxVolume ? 'green' : 'rgba(75, 192, 192, 0.5)')
          }]
        },
        options: { responsive: true }
      });

    } else {
      const data = workoutData.filter(w => w.exercise === chartSelector.value).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
      const weights = data.map(d => Math.max(...d.sets.map(s => +s[1])));

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
    }
  });

  workoutForm.addEventListener('submit', async e => {
    e.preventDefault();

    const sets = [
      [set1Reps.value, set1Weight.value],
      [set2Reps.value, set2Weight.value],
      [set3Reps.value, set3Weight.value],
      [set4Reps.value, set4Weight.value]
    ];

    const entry = {
      timestamp: new Date().toISOString(),
      muscle: muscleGroupSelect.value,
      exercise: getExerciseName(),
      sets,
      volume: calculateVolume(sets),
      notes: notes.value,
      synced: false
    };

    // workoutData.push(entry);
    workoutData.unshift(entry);
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody
      });
      const result = await response.json();
      console.log("✅ Synced with Google Sheet:", result);
      return result;
    } catch (err) {
      console.error("❌ Failed to sync:", err);
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

// const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwaXveNcyDoqfH6O0zuUK9brNGpBF2iXdsr2Ps5K9aMqdfwRzJBu9Cx-2j4HlkkpVPB/exec';

// const muscleGroups = {
//   Legs: [
//     "Hip Abduction Machine", "Hip Adduction Machine", "Calf Raise", "Hack Squat Calf Raise", "Hyperextension",
//     "Dumbbell Stiff Leg Deadlift", "Seated Leg Curl", "Reverse Hack Squat", "Lying Leg Curl", "Dumbbell Goblet Squat",
//     "Barbell Back Squat", "Leg Press", "Leg Extension", "Dumbbell Bulgarian Squat", "Dumbbell Lunge", "Machine Hack Squat",
//     "Bodyweight Walking Lunge", "Smith Machine Squat", "Bodyweight Squat Jump", "Bodyweight Wall Squat", "Sled Push", "Other…"
//   ],
//   Shoulders: [
//     "Lateral Raise", "Seated Dumbbell Press", "Overhead Press", "Standing Dumbbell Shoulder Press", "Seated Arnold Press",
//     "Seated Bent Over Dumbbell Reverse Fly", "Cable Face Pull", "Machine Reverse Fly", "Standing Dumbbell Front Raise",
//     "Machine Shoulder Press", "Cable Upright Row", "Weight Plate Front Raise", "Standing Arnold Press", "Dumbbell 6 Ways", "Other…"
//   ],
//   Biceps: [
//     "Hammer Curl", "Dumbbell Curl", "Incline Dumbbell Curl", "EZ Bar Preacher Curl", "Barbell Preacher Curl",
//     "EZ Bar Curl", "Cable Curl", "Alternating Standing Dumbbell Curl", "Dumbbell Preacher Curl",
//     "Alternating Standing Hammer Curl", "Close Grip EZ Bar Curl", "Cable Hammer Curl (Rope Extension)", "Other…"
//   ],
//   Forearm: [
//     "Behind-The-Back Barbell Wrist Curl", "Seated Barbell Wrist Curl", "Reverse Grip Cable Curl",
//     "Seated Neutral Grip Dumbbell Wrist Curl", "Reverse Grip Machine", "Neutral Grip Machine", "Other…"
//   ],
//   Triceps: [
//     "Straight Bar Tricep Extension", "Seated Dumbbell Tricep Extension", "Lying Dumbbell Extension", "EZ Bar Skullcrusher",
//     "Rope Tricep Extension", "Bent Over Dumbbell Tricep Kickback", "One-Arm Standing Dumbbell Extension",
//     "Two Arm Standing Dumbbell Extension", "High Pulley Overhead Tricep Extension", "Low Pulley Overhead Tricep Extension",
//     "Single Bench Dip", "Cable Kickbacks", "Other…"
//   ],
//   Chest: [
//     "Bench Press", "Incline Bench Press", "Decline Bench Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Dumbbell Press",
//     "Dumbbell Chest Fly", "Standing Cable Fly", "Decline Cable Fly", "High Cable Fly", "Machine Chest Fly", "Pushup",
//     "Dumbbell Pullover", "Close Grip Dumbbell Press", "Other…"
//   ],
//   Back: [
//     "Lat Pull Down", "Wide Grip Pull Up", "V-Bar Pull Down", "Underhand Close Grip Lateral Pulldown",
//     "Behind Neck Lat Pull Down", "Deadlift", "Seated Cable Row", "Machine T-Bar Row", "Dumbbell Row", "T-Bar Row",
//     "Machine Row", "Other…"
//   ]
// };


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

//   const defaultOption = new Option('Select Muscle Group', '', true, true);
//   defaultOption.disabled = true;
//   muscleGroupSelect.add(defaultOption);
//   Object.keys(muscleGroups).forEach(group => {
//     const option = new Option(group, group);
//     muscleGroupSelect.add(option);
//   });

//   chartSelector.innerHTML = '';
//   const defaultChartOption = new Option('Select Exercise', '', true, true);
//   defaultChartOption.disabled = true;
//   chartSelector.add(defaultChartOption);

//   muscleGroupSelect.addEventListener('change', () => {
//     updateExerciseDropdown(muscleGroupSelect.value);
//   });

//   exerciseSelect.addEventListener('change', () => {
//     customExercise.classList.toggle('hidden', exerciseSelect.value !== 'Other…');
//   });

//   function updateExerciseDropdown(group) {
//     exerciseSelect.innerHTML = '';
//     const defaultExerciseOption = new Option('Select Exercise', '', true, true);
//     defaultExerciseOption.disabled = true;
//     exerciseSelect.add(defaultExerciseOption);
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
//       row.classList.add('animate-fade-in');
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
//     const defaultChartOption = new Option('Select Exercise', '', true, true);
//     defaultChartOption.disabled = true;
//     chartSelector.add(defaultChartOption);
//     uniqueExercises.forEach(ex => chartSelector.add(new Option(ex, ex)));
//   }

//   chartSelector.addEventListener('change', () => {
//     if (!chartSelector.value) return;

//     const data = workoutData
//       .filter(w => w.exercise === chartSelector.value)
//       .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

//     const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
//     const weights = data.map(d => Math.max(...d.sets.map(s => parseFloat(s[1]))));

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