document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const body = document.body;
    const allViews = document.querySelectorAll('.view');
    const routineListView = document.getElementById('routine-list-view');
    const workoutPlayerView = document.getElementById('workout-player-view');
    const routineEditorView = document.getElementById('routine-editor-view');
    const historyListView = document.getElementById('history-list-view');
    const logDetailView = document.getElementById('log-detail-view');

    // Nav & Toggles
    const homeBtn = document.getElementById('home-btn');
    const historyBtn = document.getElementById('history-btn');
    const muteBtn = document.getElementById('mute-btn');
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const unitToggleBtn = document.getElementById('unit-toggle-btn');

    // Modals
    const warmupModal = document.getElementById('warmup-reminder-modal');
    const chartModal = document.getElementById('chart-modal');
    const chartCanvas = document.getElementById('progress-chart');
    const chartTitle = document.getElementById('chart-title');
    const closeChartBtn = document.getElementById('close-chart-btn');

    // Dev Panel
    const devPanel = document.getElementById('dev-panel');
    const devModeToggle = document.getElementById('dev-mode-toggle');

    // --- App State ---
    let routines = [];
    let workoutLogs = [];
    let isMuted = false;
    let weightUnit = 'lbs';
    let chartInstance = null;
    let currentWorkout = {
        routine: null, log: null, currentExerciseIndex: 0, isResting: false,
        timerInterval: null, routineToStart: null
    };
    
    // --- Functions ---
    function showView(viewToShow) {
        allViews.forEach(view => view.style.display = 'none');
        if (viewToShow) viewToShow.style.display = 'block';
        homeBtn.style.display = viewToShow === routineListView ? 'none' : 'inline-block';
        historyBtn.style.display = viewToShow === historyListView ? 'none' : 'inline-block';
    }

    // Data Persistence
    function saveRoutines() { localStorage.setItem('workoutRoutines', JSON.stringify(routines)); }
    function loadRoutines() { routines = JSON.parse(localStorage.getItem('workoutRoutines')) || []; }
    function saveLogs() { localStorage.setItem('workoutLogs', JSON.stringify(workoutLogs)); }
    function loadLogs() { workoutLogs = JSON.parse(localStorage.getItem('workoutLogs')) || []; }
    
    // Theming, Mute, and Units
    function applyDarkMode(isDark) {
        body.classList.toggle('dark-mode', isDark);
        darkModeBtn.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('darkMode', isDark);
        if (chartInstance) {
            const gridColor = getComputedStyle(body).getPropertyValue('--chart-grid-color').trim();
            const textColor = getComputedStyle(body).getPropertyValue('--text-color').trim();
            chartInstance.options.scales.x.grid.color = gridColor;
            chartInstance.options.scales.y.grid.color = gridColor;
            chartInstance.options.scales.x.ticks.color = textColor;
            chartInstance.options.scales.y.ticks.color = textColor;
            chartInstance.options.plugins.legend.labels.color = textColor;
            chartInstance.update();
        }
    }
    function initializeDarkMode() {
        const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedMode = localStorage.getItem('darkMode');
        applyDarkMode(savedMode !== null ? savedMode === 'true' : userPrefersDark);
        darkModeBtn.addEventListener('click', () => applyDarkMode(!body.classList.contains('dark-mode')));
    }
    function initializeMuteButton() {
        const savedMuteState = localStorage.getItem('isMuted');
        isMuted = savedMuteState === 'true';
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.addEventListener('click', () => { isMuted = !isMuted; localStorage.setItem('isMuted', isMuted); muteBtn.textContent = isMuted ? '🔇' : '🔊'; });
    }
    function initializeUnitToggle() {
        const savedUnit = localStorage.getItem('weightUnit');
        if (savedUnit) weightUnit = savedUnit;
        unitToggleBtn.textContent = weightUnit;
        unitToggleBtn.addEventListener('click', () => {
            weightUnit = weightUnit === 'lbs' ? 'kg' : 'lbs';
            unitToggleBtn.textContent = weightUnit;
            localStorage.setItem('weightUnit', weightUnit);
        });
    }

    // Charting
    function showProgressChart(exerciseName) {
        const filteredLogs = workoutLogs.filter(log => (log.unit || 'lbs') === weightUnit);
        const chartData = [];
        filteredLogs.forEach(log => {
            const exerciseLog = log.exercises.find(ex => ex.name.toLowerCase() === exerciseName.toLowerCase());
            if (exerciseLog) {
                const maxWeight = Math.max(0, ...exerciseLog.sets.map(set => set.weight));
                chartData.push({ date: new Date(log.date), weight: maxWeight });
            }
        });
        if (chartData.length < 2) { alert(`Not enough data logged in ${weightUnit} to create a chart. Complete at least two workouts using this unit.`); return; }
        chartData.sort((a, b) => a.date - b.date);
        const labels = chartData.map(d => d.date.toLocaleDateString());
        const dataPoints = chartData.map(d => d.weight);
        chartTitle.textContent = `${exerciseName} Progress`;
        if (chartInstance) chartInstance.destroy();
        const gridColor = getComputedStyle(body).getPropertyValue('--chart-grid-color').trim();
        const textColor = getComputedStyle(body).getPropertyValue('--text-color').trim();
        chartInstance = new Chart(chartCanvas, {
            type: 'line', data: { labels: labels, datasets: [{ label: `Max Weight (${weightUnit})`, data: dataPoints, borderColor: '#5bc0de', backgroundColor: 'rgba(91, 192, 222, 0.2)', fill: true, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { color: gridColor }, ticks: { color: textColor } } }, plugins: { legend: { labels: { color: textColor } } } }
        });
        chartModal.style.display = 'flex';
    }

    // History & Logs
    function renderHistoryList() {
        historyListView.innerHTML = `<h2>Workout History</h2><ul id="history-list"></ul>`;
        const historyListUL = historyListView.querySelector('#history-list');
        if (workoutLogs.length === 0) { historyListUL.innerHTML = '<p>No completed workouts yet.</p>'; return; }
        const sortedLogs = workoutLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedLogs.forEach(log => {
            const li = document.createElement('li');
            const logDate = new Date(log.date);
            li.innerHTML = `<span>${log.routineName}</span><span>${logDate.toLocaleDateString()} - ${logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
            li.addEventListener('click', () => renderLogDetail(log.id));
            historyListUL.appendChild(li);
        });
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clear-history-btn';
        clearBtn.textContent = 'Clear All History';
        clearBtn.className = 'danger-zone-btn';
        clearBtn.addEventListener('click', handleClearHistory);
        historyListView.appendChild(clearBtn);
    }
    function handleClearHistory() {
        if (confirm("DANGER: This will permanently delete all of your workout logs. Are you absolutely sure?")) {
            workoutLogs = [];
            saveLogs();
            renderHistoryList();
        }
    }
    function renderLogDetail(logId) {
        const log = workoutLogs.find(l => l.id === logId);
        if (!log) return;
        const logUnit = log.unit || 'lbs';
        const logDate = new Date(log.date);
        let exercisesHtml = log.exercises.map(ex => {
            let setsHtml = ex.sets.map((set, i) => `<div class="set-details">Set ${i + 1}: ${set.weight} ${logUnit} x ${set.reps} reps</div>`).join('');
            return `<li><p class="exercise-name" data-exercise-name="${ex.name}">${ex.name}</p>${setsHtml}</li>`;
        }).join('');
        logDetailView.innerHTML = `<h2>${log.routineName}</h2><p>${logDate.toLocaleDateString()} at ${logDate.toLocaleTimeString()}</p><ul id="log-detail-exercises">${exercisesHtml}</ul><button id="log-detail-back-btn">Back to History</button>`;
        logDetailView.querySelector('#log-detail-back-btn').addEventListener('click', () => showView(historyListView));
        logDetailView.querySelectorAll('.exercise-name').forEach(el => el.addEventListener('click', (e) => showProgressChart(e.target.dataset.exerciseName)));
        showView(logDetailView);
    }
    
    // Routine List & Editor
    function renderRoutineList() {
        routineListView.innerHTML = `<h2>Available Routines</h2><ul id="routine-list"></ul><button id="create-new-routine-btn">Create New Routine</button>`;
        const routineListUL = routineListView.querySelector('#routine-list');
        if (routines.length === 0) { routineListUL.innerHTML = '<p>No routines found.</p>'; }
        else {
            routines.forEach(r => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${r.name}</span><div class="routine-actions"><button class="duplicate-routine-btn" data-id="${r.id}">Duplicate</button><button class="edit-routine-btn" data-id="${r.id}">Edit</button><button class="delete-routine-btn" data-id="${r.id}">Delete</button><button class="start-workout-btn" data-id="${r.id}">Start Workout</button></div>`;
                routineListUL.appendChild(li);
            });
        }
        routineListView.querySelector('#create-new-routine-btn').addEventListener('click', () => prepareRoutineEditor());
        routineListView.querySelectorAll('.start-workout-btn').forEach(b => b.addEventListener('click', e => { currentWorkout.routineToStart = e.target.dataset.id; warmupModal.style.display = 'flex'; }));
        routineListView.querySelectorAll('.edit-routine-btn').forEach(b => b.addEventListener('click', e => prepareRoutineEditor(e.target.dataset.id)));
        routineListView.querySelectorAll('.delete-routine-btn').forEach(b => b.addEventListener('click', e => handleDeleteRoutine(e.target.dataset.id)));
        routineListView.querySelectorAll('.duplicate-routine-btn').forEach(b => b.addEventListener('click', e => handleDuplicateRoutine(e.target.dataset.id)));
    }
    function handleDuplicateRoutine(routineId) { const sourceRoutine=routines.find(r=>r.id===routineId);if(!sourceRoutine)return;const newRoutine=JSON.parse(JSON.stringify(sourceRoutine));newRoutine.id=`routine_${Date.now()}`;newRoutine.name=`${sourceRoutine.name} (Copy)`;newRoutine.exercises.forEach((ex,i)=>{ex.id=`ex_${Date.now()}_${i}`});routines.push(newRoutine);saveRoutines();renderRoutineList();}
    function handleDeleteRoutine(routineId) { if(confirm("Are you sure?")){routines=routines.filter(r=>r.id!==routineId);saveRoutines();renderRoutineList();}}
    function prepareRoutineEditor(routineId = null) {
        const routine = routines.find(r => r.id === routineId);
        routineEditorView.innerHTML = `<h2 id="editor-view-title">${routineId ? "Edit" : "Create"} Routine</h2><form id="routine-form"><input type="hidden" id="editor-routine-id" value="${routineId || ""}"><div class="form-group"><label for="editor-routine-name-input">Routine Name:</label><input type="text" id="editor-routine-name-input" value="${routine ? routine.name : ""}" required></div><div class="form-group"><label for="editor-routine-description-input">Description:</label><textarea id="editor-routine-description-input">${routine ? routine.description || "" : ""}</textarea></div><h3>Exercises:</h3><div id="editor-exercises-container"></div><button type="button" id="editor-add-exercise-btn">Add Exercise</button><div class="form-actions"><button type="submit">Save Routine</button><button type="button" id="editor-cancel-btn">Cancel</button></div></form>`;
        const container = routineEditorView.querySelector('#editor-exercises-container');
        if (routine && routine.exercises.length > 0) {
            routine.exercises.forEach(ex => addExerciseToForm(container, ex));
        } else {
            addExerciseToForm(container);
        }
        updateExerciseNumbers(container);
        showView(routineEditorView);
        routineEditorView.querySelector('#editor-routine-name-input').focus();
        routineEditorView.querySelector('#routine-form').addEventListener('submit', handleSaveRoutine);
        routineEditorView.querySelector('#editor-cancel-btn').addEventListener('click', () => showView(routineListView));
        routineEditorView.querySelector('#editor-add-exercise-btn').addEventListener('click', () => addExerciseToForm(container));
    }
    function addExerciseToForm(container, data = {}) {const template=document.getElementById('exercise-form-template');const item=template.content.cloneNode(true);item.querySelector('.exercise-name-input').value=data.name||'';item.querySelector('.exercise-sets-input').value=data.sets||2;item.querySelector('.exercise-reps-input').value=data.reps||'10-15';item.querySelector('.exercise-rest-between-sets-input').value=data.restBetweenSets===undefined?75:data.restBetweenSets;item.querySelector('.exercise-rest-after-exercise-input').value=data.restAfterExercise===undefined?105:data.restAfterExercise;item.querySelector('.exercise-notes-input').value=data.notes||'';item.querySelector('.remove-exercise-btn').addEventListener('click',e=>{e.target.closest('.exercise-form-item').remove();updateExerciseNumbers(container);});container.appendChild(item);}
    function updateExerciseNumbers(container) { container.querySelectorAll('.exercise-form-item').forEach((item, index) => { item.querySelector('.exercise-number').textContent = index + 1; }); }
    function handleSaveRoutine(e) {
        e.preventDefault();
        const form = e.target; const id = form.querySelector('#editor-routine-id').value; const data = { id: id || `r_${Date.now()}`, name: form.querySelector('#editor-routine-name-input').value.trim(), description: form.querySelector('#editor-routine-description-input').value.trim(), exercises: [] };
        if (!data.name) { alert("Name required"); return; }
        const items = form.querySelectorAll('.exercise-form-item'); if (items.length === 0) { alert("Exercises required"); return; }
        for (let i = 0; i < items.length; i++) {
            const item = items[i], name = item.querySelector('.exercise-name-input').value.trim(), sets = parseInt(item.querySelector('.exercise-sets-input').value), reps = item.querySelector('.exercise-reps-input').value.trim(), restB = parseInt(item.querySelector('.exercise-rest-between-sets-input').value), restA = parseInt(item.querySelector('.exercise-rest-after-exercise-input').value);
            if (!name || !reps || isNaN(sets) || isNaN(restB) || isNaN(restA)) { alert(`Invalid data in Ex ${i + 1}`); return; }
            data.exercises.push({ id: `ex_${Date.now()}_${i}`, name: name, sets: sets, reps: reps, restBetweenSets: restB, restAfterExercise: restA, notes: item.querySelector('.exercise-notes-input').value.trim() });
        }
        if (id) { const idx = routines.findIndex(r => r.id === id); if (idx > -1) routines[idx] = data; else routines.push(data); } else { routines.push(data); }
        saveRoutines(); renderRoutineList(); showView(routineListView);
    }

    // Player Logic
    function startWorkout(id){const r=routines.find(rt=>rt.id===id);if(!r)return;currentWorkout={...currentWorkout,routine:r,log:{id:`log_${Date.now()}`,date:new Date().toISOString(),routineName:r.name,unit:weightUnit,exercises:[]},currentExerciseIndex:0,isResting:false};if(currentWorkout.timerInterval)clearInterval(currentWorkout.timerInterval);updatePlayerUI();showView(workoutPlayerView);}
    function updatePlayerUI(){
        if(currentWorkout.isResting){
            workoutPlayerView.querySelector('#player-log-form').style.display = 'none';
            workoutPlayerView.querySelector('#player-timer-display').style.display = 'block';
            workoutPlayerView.querySelector('#player-exercise-info').style.display = 'none';
        } else {
            const ex = currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];
            if(!ex){ workoutComplete(); return; }
            workoutPlayerView.innerHTML = `
                <h2 id="player-routine-name">${currentWorkout.routine.name}</h2>
                <div id="player-exercise-info"><h3 id="player-exercise-name">${ex.name}</h3><p class="notes">${ex.notes||""}</p></div>
                <form id="player-log-form">
                    <div id="player-sets-container"></div>
                    <div class="player-controls"><button type="submit">Log & Rest</button><button type="button" id="player-end-workout-btn">End</button></div>
                </form>
                <div id="player-timer-display" style="display:none;"><h3>RESTING</h3><p id="player-timer-value">00:00</p><button id="player-skip-rest-btn">Skip</button></div>`;
            const setsContainer = workoutPlayerView.querySelector('#player-sets-container');
            for(let i = 0; i < ex.sets; i++) {
                const setDiv = document.createElement('div');
                setDiv.className = 'set-log-item';
                const weightMax = weightUnit === 'lbs' ? 500 : 250;
                const weightStep = weightUnit === 'lbs' ? 2.5 : 1;
                setDiv.innerHTML = `
                    <h4>Set ${i + 1}</h4>
                    <div class="slider-group">
                        <label>Weight (${weightUnit})</label>
                        <input type="range" class="log-weight-slider" min="0" max="${weightMax}" step="${weightStep}" value="0">
                        <input type="number" class="log-weight-input" min="0" max="${weightMax}" step="${weightStep}" value="0" required>
                    </div>
                    <div class="slider-group">
                        <label>Reps</label>
                        <input type="range" class="log-reps-slider" min="0" max="30" step="1" value="10">
                        <input type="number" class="log-reps-input" min="0" max="50" step="1" value="10" required>
                    </div>`;
                setsContainer.appendChild(setDiv);
            }
            workoutPlayerView.querySelectorAll('.set-log-item').forEach(item => {
                const weightSlider = item.querySelector('.log-weight-slider'), weightInput = item.querySelector('.log-weight-input');
                const repsSlider = item.querySelector('.log-reps-slider'), repsInput = item.querySelector('.log-reps-input');
                weightSlider.addEventListener('input', () => { weightInput.value = weightSlider.value; });
                weightInput.addEventListener('input', () => { weightSlider.value = weightInput.value; });
                repsSlider.addEventListener('input', () => { repsInput.value = repsSlider.value; });
                repsInput.addEventListener('input', () => { repsSlider.value = repsInput.value; });
            });
            workoutPlayerView.querySelector('#player-log-form').addEventListener('submit', handleLogExercise);
            workoutPlayerView.querySelector('#player-end-workout-btn').addEventListener('click', endWorkoutEarly);
            workoutPlayerView.querySelector('#player-skip-rest-btn').addEventListener('click', goToNextExercise);
        }
    }
    function handleLogExercise(e){e.preventDefault();const ex=currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];const logEx={name:ex.name,sets:[]};const setForms=workoutPlayerView.querySelectorAll('.set-log-item');let isValid=true;for(let sf of setForms){const w=sf.querySelector('.log-weight-input').value,r=sf.querySelector('.log-reps-input').value;if(w===''||r===''){alert('Fill all sets');isValid=false;break;}logEx.sets.push({weight:parseFloat(w),reps:parseInt(r)});}if(!isValid)return;currentWorkout.log.exercises.push(logEx);if(currentWorkout.currentExerciseIndex<currentWorkout.routine.exercises.length-1){startTimer(ex.restAfterExercise);}else{workoutComplete();}}
    function startTimer(duration){currentWorkout.isResting=true;updatePlayerUI();let timeLeft=duration;const timerVal=workoutPlayerView.querySelector('#player-timer-value');const updateDisplay=()=>{timerVal.textContent=`${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`;};const tick=()=>{timeLeft--;updateDisplay();if(timeLeft<0)goToNextExercise();};updateDisplay();currentWorkout.timerInterval=setInterval(tick,1000);}
    function goToNextExercise(){if(currentWorkout.timerInterval)clearInterval(currentWorkout.timerInterval);if(!isMuted)document.getElementById('timer-sound').play();currentWorkout.isResting=false;currentWorkout.currentExerciseIndex++;updatePlayerUI();}
    function workoutComplete(){if(currentWorkout.timerInterval)clearInterval(currentWorkout.timerInterval);workoutLogs.push(currentWorkout.log);saveLogs();alert("Workout Complete! Log saved.");resetWorkoutState();renderHistoryList();showView(historyListView);}
    function endWorkoutEarly(){if(confirm("End workout? Progress won't be saved.")){resetWorkoutState();showView(routineListView);}}
    function resetWorkoutState(){currentWorkout={...currentWorkout,routine:null,log:null,currentExerciseIndex:0,isResting:false,timerInterval:null,routineToStart:null};}
    
    // Dev Mode
    function initializeDevMode(){devModeToggle.addEventListener('click',()=>{const isVisible=devPanel.style.display==='block';devPanel.style.display=isVisible?'none':'block';});devPanel.querySelector('#dev-add-logs-btn').addEventListener('click',addSampleLogs);devPanel.querySelector('#dev-clear-logs-btn').addEventListener('click',()=>{if(confirm("Dev: Clear all logs?")){workoutLogs=[];saveLogs();alert("Logs cleared.");renderHistoryList();}});devPanel.querySelector('#dev-clear-routines-btn').addEventListener('click',()=>{if(confirm("Dev: Clear all routines?")){routines=[];saveRoutines();alert("Routines cleared.");renderRoutineList();}});devPanel.querySelector('#dev-clear-all-btn').addEventListener('click',()=>{if(confirm("Dev: Clear ALL localStorage data?")){localStorage.clear();alert("All data cleared. Please refresh the page.");location.reload();}});}
    function addSampleLogs(){if(!routines.length||!routines[0].exercises.length){alert("Create at least one routine with exercises before adding sample logs.");return;}const sampleLogs=[];const baseWeight=100;const baseReps=8;for(let i=0;i<5;i++){const date=new Date();date.setDate(date.getDate()-(i*7));const sampleLog={id:`log_sample_${Date.now()}_${i}`,date:date.toISOString(),routineName:routines[0].name,unit:'lbs',exercises:[]};routines[0].exercises.forEach(ex=>{sampleLog.exercises.push({name:ex.name,sets:[{weight:baseWeight+(i*5),reps:baseReps},{weight:baseWeight+(i*5),reps:baseReps-1}]});});sampleLogs.push(sampleLog);}workoutLogs=workoutLogs.concat(sampleLogs);saveLogs();alert("Added 5 sample logs based on your first routine.");renderHistoryList();}

    // --- Event Listeners ---
    homeBtn.addEventListener('click', () => showView(routineListView));
    historyBtn.addEventListener('click', () => { renderHistoryList(); showView(historyListView); });
    closeChartBtn.addEventListener('click', () => chartModal.style.display = 'none');
    warmupModal.querySelector('#confirm-warmup-done-btn').addEventListener('click', () => { warmupModal.style.display = 'none'; if (currentWorkout.routineToStart) startWorkout(currentWorkout.routineToStart); });
    warmupModal.querySelector('#cancel-start-workout-btn').addEventListener('click', () => { warmupModal.style.display = 'none'; currentWorkout.routineToStart = null; });

    // --- Initialization ---
    initializeDarkMode();
    initializeMuteButton();
    initializeUnitToggle();
    initializeDevMode();
    loadRoutines();
    loadLogs();
    renderRoutineList();
    showView(routineListView);
});