// =========================================================================================
// === USE THIS FULL, FINAL, AND VERIFIED SCRIPT FOR app.js ==============================
// =========================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- App State ---
    let routines = [], workoutLogs = [], isMuted = false, weightUnit = 'lbs', chartInstance = null;
    let currentWorkout = { routine: null, log: null, currentExerciseIndex: 0, currentSet: 1, isResting: false, exerciseStatuses: [], timerInterval: null, routineToStart: null, restType: null, nextIndex: -1 };
    
    const masterExerciseList = { "Chest": ["Machine Chest Press", "Incline Machine Press", "Pec Deck Machine", "Cable Crossover", "Barbell Bench Press", "Dumbbell Bench Press", "Incline Dumbbell Press", "Weighted Dips"], "Back": ["Lat Pulldown", "Seated Cable Row", "T-Bar Row", "Machine Pullover", "Pull-ups", "Barbell Row", "Dumbbell Row"], "Shoulders": ["Machine Shoulder Press", "Dumbbell Lateral Raise", "Cable Lateral Raise", "Face Pulls", "Overhead Press (Barbell)"], "Quads": ["Leg Press Machine", "Hack Squat Machine", "Leg Extension Machine", "Barbell Back Squat", "Goblet Squat"], "Hamstrings & Glutes": ["Lying Leg Curl", "Seated Leg Curl", "Hip Extension (45-degree)", "Hip Adductor Machine", "Hip Abductor Machine", "Romanian Deadlift"], "Arms": ["Bicep Curl Machine", "Dumbbell Bicep Curls", "Tricep Pushdown (Rope)", "Tricep Pushdown (Bar)", "Close Grip Bench Press"], "Calves": ["Seated Calf Raise", "Standing Calf Raise"] };

    // --- DOM Element Getters ---
    const getEl = (id) => document.getElementById(id);
    const queryAll = (selector) => document.querySelectorAll(selector);

    // --- Core Functions ---
    function buildHeader() {
        getEl('app-header').innerHTML = `<h1>My Workout Routines</h1><div class="header-nav"><button id="history-btn" class="nav-btn">History</button><button id="home-btn" class="nav-btn" style="display: none;">Routines</button><button id="unit-toggle-btn" class="nav-btn">lbs</button><button id="dark-mode-btn" class="icon-btn">🌙</button><button id="mute-btn" class="icon-btn">🔊</button></div>`;
        
        getEl('history-btn').addEventListener('click', () => {
            renderHistoryList();
            showView('history-list-view');
        });
        getEl('home-btn').addEventListener('click', () => {
            renderRoutineList();
            showView('routine-list-view');
        });
        getEl('dark-mode-btn').addEventListener('click', () => {
            const isCurrentlyDark = document.body.classList.contains('dark-mode');
            applyDarkMode(!isCurrentlyDark);
        });
        getEl('mute-btn').addEventListener('click', toggleMute);
        getEl('unit-toggle-btn').addEventListener('click', toggleUnit);
    }
    
    function showView(viewId) {
        queryAll('.view').forEach(v => v.style.display = 'none');
        const viewToShow = getEl(viewId);
        if (viewToShow) viewToShow.style.display = 'block';
        const homeBtn = getEl('home-btn'), historyBtn = getEl('history-btn');
        if (homeBtn && historyBtn) {
            homeBtn.style.display = viewId === 'routine-list-view' ? 'none' : 'inline-block';
            historyBtn.style.display = viewId === 'history-list-view' ? 'none' : 'inline-block';
        }
    }

    // Data Persistence
    function saveRoutines() { localStorage.setItem('workoutRoutines', JSON.stringify(routines)); }
    function loadRoutines() { routines = JSON.parse(localStorage.getItem('workoutRoutines')) || []; }
    function saveLogs() { localStorage.setItem('workoutLogs', JSON.stringify(workoutLogs)); }
    function loadLogs() { workoutLogs = JSON.parse(localStorage.getItem('workoutLogs')) || []; }
    
    // Theming, Mute, and Units
    function applyDarkMode(isDark) { document.body.classList.toggle('dark-mode', isDark); getEl('dark-mode-btn').textContent = isDark ? '☀️' : '🌙'; localStorage.setItem('darkMode', isDark); if (chartInstance) { const gridColor = getComputedStyle(document.body).getPropertyValue('--chart-grid-color').trim(), textColor = getComputedStyle(document.body).getPropertyValue('--text-color').trim(); chartInstance.options.scales.x.grid.color = gridColor; chartInstance.options.scales.y.grid.color = gridColor; chartInstance.options.scales.x.ticks.color = textColor; chartInstance.options.scales.y.ticks.color = textColor; chartInstance.options.plugins.legend.labels.color = textColor; chartInstance.update(); } }
    
    function toggleMute() {
        isMuted = !isMuted;
        getEl('mute-btn').textContent = isMuted ? '🔇' : '🔊';
        localStorage.setItem('workoutMuted', isMuted);
    }
    function toggleUnit() {
        weightUnit = weightUnit === 'lbs' ? 'kg' : 'lbs';
        getEl('unit-toggle-btn').textContent = weightUnit;
        localStorage.setItem('workoutUnit', weightUnit);
        if (getEl('workout-player-view').style.display === 'block' && !currentWorkout.isResting) {
            updatePlayerUI();
        }
    }

    // Charting
    function showProgressChart(exerciseName) { const filteredLogs = workoutLogs.filter(log => (log.unit || 'lbs') === weightUnit); const chartData = []; filteredLogs.forEach(log => { const exerciseLog = log.exercises.find(ex => ex.name.toLowerCase() === exerciseName.toLowerCase()); if (exerciseLog) { const maxWeight = Math.max(0, ...exerciseLog.sets.map(set => set.weight)); chartData.push({ date: new Date(log.date), weight: maxWeight }); } }); if (chartData.length < 2) { alert(`Not enough data logged in ${weightUnit} to create a chart.`); return; } chartData.sort((a, b) => a.date - b.date); const labels = chartData.map(d => d.date.toLocaleDateString()), dataPoints = chartData.map(d => d.weight); getEl('chart-title').textContent = `${exerciseName} Progress`; if (chartInstance) chartInstance.destroy(); const gridColor = getComputedStyle(document.body).getPropertyValue('--chart-grid-color').trim(), textColor = getComputedStyle(document.body).getPropertyValue('--text-color').trim(); chartInstance = new Chart(getEl('progress-chart'), { type: 'line', data: { labels: labels, datasets: [{ label: `Max Weight (${weightUnit})`, data: dataPoints, borderColor: '#5bc0de', backgroundColor: 'rgba(91, 192, 222, 0.2)', fill: true, tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { color: gridColor }, ticks: { color: textColor } } }, plugins: { legend: { labels: { color: textColor } } } } }); getEl('chart-modal').style.display = 'flex'; }
    
    // History & Logs
    function renderHistoryList() { const historyListUL = getEl('history-list'), historyActions = getEl('history-actions'); historyListUL.innerHTML = ''; historyActions.innerHTML = ''; if (workoutLogs.length === 0) { historyListUL.innerHTML = '<p>No completed workouts yet.</p>'; return; } const sortedLogs = workoutLogs.sort((a, b) => new Date(b.date) - new Date(a.date)); sortedLogs.forEach(log => { const li = document.createElement('li'); const logDate = new Date(log.date); li.innerHTML = `<span>${log.routineName}</span><span>${logDate.toLocaleDateString()} - ${logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`; li.addEventListener('click', () => renderLogDetail(log.id)); historyListUL.appendChild(li); }); const clearBtn = document.createElement('button'); clearBtn.id = 'clear-history-btn'; clearBtn.textContent = 'Clear All History'; clearBtn.className = 'danger-zone-btn'; clearBtn.addEventListener('click', handleClearHistory); historyActions.appendChild(clearBtn); }
    function handleClearHistory() { if (confirm("DANGER: This will permanently delete all of your workout logs. Are you absolutely sure?")) { workoutLogs = []; saveLogs(); renderHistoryList(); } }
    function renderLogDetail(logId) { const log = workoutLogs.find(l => l.id === logId); if (!log) return; const logUnit = log.unit || 'lbs'; const logDate = new Date(log.date); let exercisesHtml = log.exercises.map(ex => { let setsHtml = ex.sets.map((set, i) => `<div class="set-details">Set ${i + 1}: ${set.weight} ${logUnit} x ${set.reps} reps</div>`).join(''); return `<li><p class="exercise-name" data-exercise-name="${ex.name}">${ex.name}</p>${setsHtml}</li>`; }).join(''); getEl('log-detail-view').innerHTML = `<h2>${log.routineName}</h2><p>${logDate.toLocaleDateString()} at ${logDate.toLocaleTimeString()}</p><ul id="log-detail-exercises">${exercisesHtml}</ul><button id="log-detail-back-btn">Back to History</button>`; getEl('log-detail-view').querySelector('#log-detail-back-btn').addEventListener('click', () => showView('history-list-view')); getEl('log-detail-view').querySelectorAll('.exercise-name').forEach(el => el.addEventListener('click', (e) => showProgressChart(e.target.dataset.exerciseName))); showView('log-detail-view'); }
    
    // --- Routine List & Editor ---
    function renderRoutineList() {
        const routineListUL = getEl('routine-list');
        routineListUL.innerHTML = '';
        if (routines.length === 0) {
            routineListUL.innerHTML = '<p>No routines found.</p>';
        } else {
            routines.forEach(r => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${r.name}</span><div class="routine-actions"><button class="duplicate-routine-btn" data-id="${r.id}">Duplicate</button><button class="edit-routine-btn" data-id="${r.id}">Edit</button><button class="delete-routine-btn" data-id="${r.id}">Delete</button><button class="start-workout-btn" data-id="${r.id}">Start Workout</button></div>`;
                routineListUL.appendChild(li);
            });
        }
        queryAll('#routine-list .start-workout-btn').forEach(b => b.addEventListener('click', e => { currentWorkout.routineToStart = e.target.dataset.id; getEl('warmup-reminder-modal').style.display = 'flex'; }));
        queryAll('#routine-list .edit-routine-btn').forEach(b => b.addEventListener('click', e => prepareRoutineEditor(e.target.dataset.id)));
        queryAll('#routine-list .delete-routine-btn').forEach(b => b.addEventListener('click', e => handleDeleteRoutine(e.target.dataset.id)));
        queryAll('#routine-list .duplicate-routine-btn').forEach(b => b.addEventListener('click', e => handleDuplicateRoutine(e.target.dataset.id)));
    }
    function handleDuplicateRoutine(routineId) { const sourceRoutine=routines.find(r=>r.id===routineId);if(!sourceRoutine)return;const newRoutine=JSON.parse(JSON.stringify(sourceRoutine));newRoutine.id=`routine_${Date.now()}`;newRoutine.name=`${sourceRoutine.name} (Copy)`;newRoutine.exercises.forEach((ex,i)=>{ex.id=`ex_${Date.now()}_${i}`});routines.push(newRoutine);saveRoutines();renderRoutineList();}
    function handleDeleteRoutine(routineId) { if(confirm("Are you sure?")){routines=routines.filter(r=>r.id!==routineId);saveRoutines();renderRoutineList();}}
    function prepareRoutineEditor(routineId = null) {
        const routine = routines.find(r => r.id === routineId);
        showView('routine-editor-view');
        // ** MODIFIED **: Changed placeholder text to be more descriptive
        getEl('routine-editor-view').innerHTML = `<div class="editor-grid"><div class="editor-panel"><h3>Exercise Library</h3><div id="library-container"></div></div><div class="editor-panel"><h3>Your Routine</h3><form id="routine-form"><input type="hidden" id="editor-routine-id" value="${routineId || ""}"><div class="form-group"><label>Routine Name:</label><input type="text" id="editor-routine-name-input" value="${routine ? routine.name : ""}" required></div><div class="routine-defaults"><h4>Default Settings</h4><div class="form-group-inline"><div class="form-group"><label>Sets:</label><input type="number" id="editor-default-sets" value="3" min="1" required></div><div class="form-group"><label>Reps:</label><input type="text" id="editor-default-reps" value="8-12" required></div></div><div class="form-group-inline"><div class="form-group"><label>Rest (Sets):</label><input type="number" id="editor-default-rest-sets" value="180" min="0" required></div><div class="form-group"><label>Rest (Exer.):</label><input type="number" id="editor-default-rest-exercise" value="180" min="0" required></div></div></div><div id="routine-exercise-list" class="drop-zone"><p class="drop-zone-placeholder">Tap library items or drag them here</p></div><div class="form-actions"><button type="submit">Save Routine</button><button type="button" id="editor-cancel-btn">Cancel</button></div></form></div></div>`;
        
        buildLibrary();
        
        const routineListEl = getEl('routine-exercise-list');
        if (routine && routine.exercises.length > 0) {
            const defaults = routine.exercises[0];
            getEl('editor-default-sets').value = defaults.sets;
            getEl('editor-default-reps').value = defaults.reps;
            getEl('editor-default-rest-sets').value = defaults.restBetweenSets;
            getEl('editor-default-rest-exercise').value = defaults.restAfterExercise;
            routine.exercises.forEach(ex => { const item = createRoutineExerciseItem(ex.name); routineListEl.appendChild(item); });
            const placeholder = routineListEl.querySelector('.drop-zone-placeholder');
            if(placeholder) placeholder.style.display = 'none';
        }

        getEl('routine-editor-view').querySelectorAll('.library-list').forEach(list => { new Sortable(list, { group: { name: 'shared', pull: 'clone', put: false }, sort: false, animation: 150 }); });
        new Sortable(routineListEl, { group: 'shared', animation: 150, onAdd: function (evt) { const oldItem = evt.item; const newItem = createRoutineExerciseItem(oldItem.textContent); evt.to.insertBefore(newItem, oldItem); evt.to.removeChild(oldItem); const placeholder = routineListEl.querySelector('.drop-zone-placeholder'); if (placeholder) placeholder.style.display = 'none'; } });
        
        getEl('routine-form').addEventListener('submit', handleSaveRoutine);
        getEl('editor-cancel-btn').addEventListener('click', () => showView('routine-list-view'));
    }
    // ** NEW **: Handler for the "tap-to-add" functionality
    function handleLibraryItemClick(e) {
        const exerciseName = e.currentTarget.textContent;
        const routineListEl = getEl('routine-exercise-list');
        const newItem = createRoutineExerciseItem(exerciseName);
        routineListEl.appendChild(newItem);
        
        // Hide the placeholder text
        const placeholder = routineListEl.querySelector('.drop-zone-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }
    // ** MODIFIED **: Added a click listener to each library item
    function buildLibrary(){const container=getEl('library-container');container.innerHTML='';for(const category in masterExerciseList){const details=document.createElement('details');details.className='library-category';const summary=document.createElement('summary');summary.textContent=category;const list=document.createElement('div');list.className='library-list';masterExerciseList[category].forEach(exName=>{const item=document.createElement('div');item.className='library-item';item.textContent=exName;item.addEventListener('click', handleLibraryItemClick); list.appendChild(item);});details.appendChild(summary);details.appendChild(list);container.appendChild(details);}}
    function createRoutineExerciseItem(name){const item=document.createElement('div');item.className='routine-exercise-item';item.textContent=name;const removeBtn=document.createElement('button');removeBtn.type='button';removeBtn.className='remove-exercise-btn';removeBtn.innerHTML='×';removeBtn.addEventListener('click',()=>item.remove());item.appendChild(removeBtn);return item;}
    function handleSaveRoutine(e){
        e.preventDefault();
        const form=e.target;const id=form.querySelector('#editor-routine-id').value;const defaultSets=parseInt(form.querySelector('#editor-default-sets').value);const defaultReps=form.querySelector('#editor-default-reps').value.trim();const defaultRestSets=parseInt(form.querySelector('#editor-default-rest-sets').value);const defaultRestExercise=parseInt(form.querySelector('#editor-default-rest-exercise').value);const data={id:id||`r_${Date.now()}`,name:form.querySelector('#editor-routine-name-input').value.trim(),exercises:[]};if(!data.name||!defaultReps||isNaN(defaultSets)||isNaN(defaultRestSets)||isNaN(defaultRestExercise)){alert("Please fill out name and all default settings.");return;}
        const exerciseItems=form.querySelectorAll('.routine-exercise-item');if(exerciseItems.length===0){alert("Please add at least one exercise.");return;}
        exerciseItems.forEach((item,index)=>{const name=item.childNodes[0].nodeValue.trim();if(name){data.exercises.push({id:`ex_${Date.now()}_${index}`,name:name,sets:defaultSets,reps:defaultReps,restBetweenSets:defaultRestSets,restAfterExercise:defaultRestExercise,notes:""});}});if(data.exercises.length===0){alert("An error occurred gathering exercises.");return;}
        if(id){const idx=routines.findIndex(r=>r.id===id);if(idx>-1)routines[idx]=data;else routines.push(data);}else{routines.push(data);}
        saveRoutines();renderRoutineList();showView('routine-list-view');
    }
    
    // Player Logic
    function startWorkout(id){const r=routines.find(rt=>rt.id===id);if(!r)return;currentWorkout={...currentWorkout,routine:r,log:{id:`log_${Date.now()}`,date:new Date().toISOString(),routineName:r.name,unit:weightUnit,exercises:[]},currentExerciseIndex:0,currentSet:1,isResting:false,exerciseStatuses:r.exercises.map(()=>'pending')};if(currentWorkout.timerInterval)clearInterval(currentWorkout.timerInterval);prepareExerciseLog();updatePlayerUI();showView('workout-player-view');}
    function updatePlayerUI(){const playerContent=getEl('workout-player-view');playerContent.innerHTML='';if(currentWorkout.isResting){playerContent.innerHTML=`<div id="player-timer-display"><h3>RESTING</h3><p id="player-timer-value">00:00</p><button id="player-skip-rest-btn">Skip Rest</button></div>`;playerContent.querySelector('#player-skip-rest-btn').addEventListener('click',()=>handleTimerEnd(currentWorkout.restType,currentWorkout.nextIndex));return;}const ex=currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];if(!ex){workoutComplete();return;}const totalSets=ex.sets;const buttonText=currentWorkout.currentSet<totalSets?'Log Set & Rest':'Log Final Set';playerContent.innerHTML=`<h2>${currentWorkout.routine.name}</h2><div id="player-exercise-info"><h3>${ex.name}</h3><p>Set ${currentWorkout.currentSet} of ${totalSets}</p><p class="notes">${ex.notes||""}</p></div><button type="button" id="player-jump-to-btn">Jump To Exercise...</button><form id="player-log-form"><div class="set-log-item"><div class="slider-group"><label>Weight (${weightUnit})</label><input type="range" class="log-weight-slider" min="0" max="${weightUnit==='lbs'?500:250}" step="${weightUnit==='lbs'?2.5:1}" value="0"><input type="number" class="log-weight-input" min="0" max="${weightUnit==='lbs'?500:250}" step="${weightUnit==='lbs'?2.5:1}" value="0" placeholder="${weightUnit}" required></div><div class="slider-group"><label>Reps</label><input type="range" class="log-reps-slider" min="0" max="30" step="1" value="10"><input type="number" class="log-reps-input" min="0" max="50" step="1" value="10" placeholder="reps" required></div></div><div class="player-controls"><button type="submit">${buttonText}</button><button type="button" id="player-end-workout-btn">End Workout</button></div></form>`;const weightSlider=playerContent.querySelector('.log-weight-slider'),weightInput=playerContent.querySelector('.log-weight-input'),repsSlider=playerContent.querySelector('.log-reps-slider'),repsInput=playerContent.querySelector('.log-reps-input');weightSlider.addEventListener('input',()=>{weightInput.value=weightSlider.value;});weightInput.addEventListener('input',()=>{weightSlider.value=weightInput.value;});repsSlider.addEventListener('input',()=>{repsInput.value=repsSlider.value;});repsInput.addEventListener('input',()=>{repsSlider.value=repsInput.value;});playerContent.querySelector('#player-jump-to-btn').addEventListener('click',renderJumpToList);playerContent.querySelector('#player-log-form').addEventListener('submit',handleLogSet);playerContent.querySelector('#player-end-workout-btn').addEventListener('click',endWorkoutEarly);}
    function handleLogSet(e){e.preventDefault();const weight=parseFloat(getEl('workout-player-view').querySelector('.log-weight-input').value),reps=parseInt(getEl('workout-player-view').querySelector('.log-reps-input').value);if(isNaN(weight)||isNaN(reps)){alert('Please enter valid numbers.');return;}currentWorkout.log.exercises[currentWorkout.currentExerciseIndex].sets.push({weight,reps});const ex=currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];if(currentWorkout.currentSet<ex.sets){currentWorkout.currentSet++;startTimer(ex.restBetweenSets,'set');}else{currentWorkout.exerciseStatuses[currentWorkout.currentExerciseIndex]='completed';const nextIndex=findNextPendingExercise();if(nextIndex!==-1){startTimer(ex.restAfterExercise,'exercise',nextIndex);}else{workoutComplete();}}}
    function prepareExerciseLog(){if(!currentWorkout.log.exercises[currentWorkout.currentExerciseIndex]){const ex=currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];currentWorkout.log.exercises[currentWorkout.currentExerciseIndex]={name:ex.name,sets:[]};}}
    function findNextPendingExercise(){const total=currentWorkout.exerciseStatuses.length;for(let i=0;i<total;i++){const checkIndex=(currentWorkout.currentExerciseIndex+1+i)%total;if(currentWorkout.exerciseStatuses[checkIndex]==='pending')return checkIndex;}return -1;}
    function renderJumpToList(){const list=getEl('jump-to-modal').querySelector('#jump-to-list');list.innerHTML='';currentWorkout.routine.exercises.forEach((ex,index)=>{if(currentWorkout.exerciseStatuses[index]==='pending'){const li=document.createElement('li');li.textContent=ex.name;li.dataset.index=index;li.addEventListener('click',()=>{currentWorkout.currentExerciseIndex=parseInt(li.dataset.index);currentWorkout.currentSet=1;prepareExerciseLog();updatePlayerUI();getEl('jump-to-modal').style.display='none';});list.appendChild(li);}});getEl('jump-to-modal').style.display='flex';}
    function startTimer(duration,type,nextIndex=-1){currentWorkout.isResting=true;currentWorkout.restType=type;currentWorkout.nextIndex=nextIndex;updatePlayerUI();let timeLeft=duration;const timerVal=getEl('workout-player-view').querySelector('#player-timer-value');const timerCallback=()=>handleTimerEnd(type,nextIndex);if(getEl('player-skip-rest-btn'))getEl('player-skip-rest-btn').addEventListener('click',timerCallback,{once:true});const updateDisplay=()=>{if(timerVal)timerVal.textContent=`${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`;};const tick=()=>{timeLeft--;updateDisplay();if(timeLeft<0)timerCallback();};updateDisplay();currentWorkout.timerInterval=setInterval(tick,1000);}
    function handleTimerEnd(type,nextIndex){if(!currentWorkout.isResting)return;if(currentWorkout.timerInterval)clearInterval(currentWorkout.timerInterval);currentWorkout.timerInterval=null;if(!isMuted)getEl('timer-sound').play();currentWorkout.isResting=false;if(type==='set'){updatePlayerUI();}else if(type==='exercise'){currentWorkout.currentExerciseIndex=nextIndex;currentWorkout.currentSet=1;prepareExerciseLog();updatePlayerUI();}}
    function workoutComplete(){if(currentWorkout.timerInterval)clearInterval(currentWorkout.timerInterval);workoutLogs.push(currentWorkout.log);saveLogs();alert("Workout Complete! Log saved.");resetWorkoutState();renderHistoryList();showView('history-list-view');}
    function endWorkoutEarly(){if(confirm("End workout? Progress won't be saved.")){resetWorkoutState();showView('routine-list-view');}}
    function resetWorkoutState(){currentWorkout={...currentWorkout,routine:null,log:null,currentExerciseIndex:0,currentSet:1,isResting:false,exerciseStatuses:[],timerInterval:null,routineToStart:null};}
    
    // Dev Mode
    function initializeDevMode(){getEl('dev-mode-toggle').addEventListener('click',()=>{const isVisible=getEl('dev-panel').style.display==='block';getEl('dev-panel').style.display=isVisible?'none':'block';});getEl('dev-add-logs-btn').addEventListener('click',addSampleLogs);getEl('dev-clear-logs-btn').addEventListener('click',()=>{if(confirm("Dev: Clear all logs?")){workoutLogs=[];saveLogs();alert("Logs cleared.");renderHistoryList();}});getEl('dev-clear-routines-btn').addEventListener('click',()=>{if(confirm("Dev: Clear all routines?")){routines=[];saveRoutines();alert("Routines cleared.");renderRoutineList();}});getEl('dev-clear-all-btn').addEventListener('click',()=>{if(confirm("Dev: Clear ALL localStorage data?")){localStorage.clear();alert("All data cleared. Please refresh the page.");location.reload();}});getEl('dev-import-btn').addEventListener('click',handleDevImport);}
    function handleDevImport(){const importText=getEl('dev-import-textarea').value;if(!importText.trim()){alert("Text area is empty.");return;}try{const newRoutine=JSON.parse(importText);if(!newRoutine.name||!Array.isArray(newRoutine.exercises)){throw new Error("Invalid structure.");}newRoutine.id=`routine_${Date.now()}`;routines.push(newRoutine);saveRoutines();renderRoutineList();alert(`Imported: "${newRoutine.name}"`);getEl('dev-import-textarea').value='';showView('routine-list-view');}catch(error){console.error("Import Error:",error);alert("Import failed! Invalid JSON format.");}}
    function addSampleLogs(){if(!routines.length||!routines[0].exercises.length){alert("Create at least one routine with exercises before adding sample logs.");return;}const sampleLogs=[];const baseWeight=100;const baseReps=8;for(let i=4;i>=0;i--){const date=new Date();date.setDate(date.getDate()-(i*7));const sampleLog={id:`log_sample_${Date.now()}_${i}`,date:date.toISOString(),routineName:routines[0].name,unit:'lbs',exercises:[]};routines[0].exercises.forEach(ex=>{sampleLog.exercises.push({name:ex.name,sets:[{weight:baseWeight+(i*5),reps:baseReps},{weight:baseWeight+(i*5),reps:baseReps-1}]});});sampleLogs.push(sampleLog);}workoutLogs=workoutLogs.concat(sampleLogs);saveLogs();alert("Added 5 sample logs based on your first routine.");renderHistoryList();}
    
    // --- Event Listeners for Static Elements ---
    function initializeAppListeners() {
        getEl('create-new-routine-btn').addEventListener('click', () => prepareRoutineEditor());
        
        getEl('close-chart-btn').addEventListener('click', () => getEl('chart-modal').style.display = 'none');
        getEl('jump-to-modal').querySelector('#close-jump-modal-btn').addEventListener('click', () => getEl('jump-to-modal').style.display = 'none');
        getEl('warmup-reminder-modal').querySelector('#confirm-warmup-done-btn').addEventListener('click', () => { getEl('warmup-reminder-modal').style.display = 'none'; if (currentWorkout.routineToStart) startWorkout(currentWorkout.routineToStart); });
        getEl('warmup-reminder-modal').querySelector('#cancel-start-workout-btn').addEventListener('click', () => { getEl('warmup-reminder-modal').style.display = 'none'; currentWorkout.routineToStart = null; });
        
        initializeDevMode();
    }
    
    // --- Initialization ---
    buildHeader();
    initializeAppListeners();

    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    applyDarkMode(savedDarkMode);

    isMuted = localStorage.getItem('workoutMuted') === 'true';
    getEl('mute-btn').textContent = isMuted ? '🔇' : '🔊';

    weightUnit = localStorage.getItem('workoutUnit') || 'lbs';
    getEl('unit-toggle-btn').textContent = weightUnit;
    
    loadRoutines();
    loadLogs();
    renderRoutineList();
    showView('routine-list-view');
});