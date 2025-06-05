document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const routineListView = document.getElementById('routine-list-view');
    const workoutPlayerView = document.getElementById('workout-player-view');
    const routineEditorView = document.getElementById('routine-editor-view');
    const allViews = [routineListView, workoutPlayerView, routineEditorView];

    const routineListUL = document.getElementById('routine-list');
    const createNewRoutineBtn = document.getElementById('create-new-routine-btn');
    const muteBtn = document.getElementById('mute-btn'); // Mute button

    // Player elements
    const playerRoutineName = document.getElementById('player-routine-name');
    const playerExerciseName = document.getElementById('player-exercise-name');
    const playerCurrentSet = document.getElementById('player-current-set');
    const playerTotalSets = document.getElementById('player-total-sets');
    const playerRepsTarget = document.getElementById('player-reps-target');
    const playerExerciseNotes = document.getElementById('player-exercise-notes');
    const playerTimerDisplay = document.getElementById('player-timer-display');
    const playerTimerValue = document.getElementById('player-timer-value');
    const playerSetActionBtn = document.getElementById('player-set-action-btn');
    const playerNextExerciseBtn = document.getElementById('player-next-exercise-btn');
    const playerEndWorkoutBtn = document.getElementById('player-end-workout-btn');

    // Editor elements
    const routineForm = document.getElementById('routine-form');
    const editorViewTitle = document.getElementById('editor-view-title');
    const editorRoutineIdInput = document.getElementById('editor-routine-id');
    const editorRoutineNameInput = document.getElementById('editor-routine-name-input');
    const editorRoutineDescriptionInput = document.getElementById('editor-routine-description-input');
    const editorExercisesContainer = document.getElementById('editor-exercises-container');
    const editorAddExerciseBtn = document.getElementById('editor-add-exercise-btn');
    const editorCancelBtn = document.getElementById('editor-cancel-btn');
    const exerciseFormTemplate = document.getElementById('exercise-form-template');

    // Modal elements
    const warmupModal = document.getElementById('warmup-reminder-modal');
    const confirmWarmupBtn = document.getElementById('confirm-warmup-done-btn');
    const cancelWarmupBtn = document.getElementById('cancel-start-workout-btn');

    // --- App State ---
    let routines = [];
    let isMuted = false;
    let currentWorkout = {
        routine: null,
        currentExerciseIndex: 0,
        currentSet: 1,
        isResting: false,
        timerInterval: null,
        routineToStart: null
    };

    const defaultRoutines = [
        {
            id: 'machine_full_body_v1',
            name: 'Minimalist Machine Full Body',
            description: '2 sets per exercise, focus on challenging weight.',
            exercises: [
              { id: 'exm1', name: 'Leg Press Machine', sets: 2, reps: '10-15', restBetweenSets: 75, restAfterExercise: 105, notes: 'Focus on quads, glutes, hamstrings.' },
              { id: 'exm2', name: 'Seated Leg Curl', sets: 2, reps: '10-15', restBetweenSets: 75, restAfterExercise: 105, notes: 'Isolate hamstrings.' },
              { id: 'exm3', name: 'Chest Press Machine', sets: 2, reps: '10-15', restBetweenSets: 75, restAfterExercise: 105, notes: 'Targets chest, front shoulders, triceps.' },
              { id: 'exm4', name: 'Shoulder Press Machine', sets: 2, reps: '10-15', restBetweenSets: 75, restAfterExercise: 105, notes: 'Targets shoulders, triceps.' },
              { id: 'exm5', name: 'Lat Pulldown Machine', sets: 2, reps: '10-15', restBetweenSets: 75, restAfterExercise: 105, notes: 'Targets lats, biceps.' },
              { id: 'exm6', name: 'Seated Row Machine', sets: 2, reps: '10-15', restBetweenSets: 75, restAfterExercise: 105, notes: 'Targets mid-back, lats, biceps.' },
              { id: 'exm7', name: 'Abdominal Crunch Machine', sets: 2, reps: '12-15', restBetweenSets: 60, restAfterExercise: 0, notes: 'Optional. Targets abdominals.' }
            ]
        }
    ];

    // --- Functions ---

    function showView(viewToShow) {
        allViews.forEach(view => view.style.display = 'none');
        viewToShow.style.display = 'block';
    }

    function saveRoutines() {
        localStorage.setItem('workoutRoutines', JSON.stringify(routines));
    }

    function loadRoutines() {
        const storedRoutines = localStorage.getItem('workoutRoutines');
        if (storedRoutines) {
            routines = JSON.parse(storedRoutines);
        } else {
            routines = JSON.parse(JSON.stringify(defaultRoutines));
            saveRoutines();
        }
    }

    function renderRoutineList() {
        routineListUL.innerHTML = '';
        if (routines.length === 0) {
            routineListUL.innerHTML = '<p>No routines found. Click "Create New Routine" to add one.</p>';
            return;
        }
        routines.forEach(routine => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${routine.name}</span>
                <div class="routine-actions">
                    <button class="duplicate-routine-btn" data-id="${routine.id}">Duplicate</button>
                    <button class="edit-routine-btn" data-id="${routine.id}">Edit</button>
                    <button class="delete-routine-btn" data-id="${routine.id}">Delete</button>
                    <button class="start-workout-btn" data-id="${routine.id}">Start Workout</button>
                </div>
            `;
            routineListUL.appendChild(li);
        });

        // Add event listeners for newly created buttons
        document.querySelectorAll('.start-workout-btn').forEach(b => b.addEventListener('click', (e) => { currentWorkout.routineToStart = e.target.dataset.id; warmupModal.style.display = 'flex'; }));
        document.querySelectorAll('.edit-routine-btn').forEach(b => b.addEventListener('click', (e) => { prepareRoutineEditor(e.target.dataset.id); }));
        document.querySelectorAll('.delete-routine-btn').forEach(b => b.addEventListener('click', (e) => { handleDeleteRoutine(e.target.dataset.id); }));
        document.querySelectorAll('.duplicate-routine-btn').forEach(b => b.addEventListener('click', (e) => { handleDuplicateRoutine(e.target.dataset.id); }));
    }

    function handleDuplicateRoutine(routineId) {
        const sourceRoutine = routines.find(r => r.id === routineId);
        if (!sourceRoutine) return;
        const newRoutine = JSON.parse(JSON.stringify(sourceRoutine));
        newRoutine.id = `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newRoutine.name = `${sourceRoutine.name} (Copy)`;
        newRoutine.exercises.forEach((ex, i) => { ex.id = `ex_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`; });
        routines.push(newRoutine);
        saveRoutines();
        renderRoutineList();
    }

    function handleDeleteRoutine(routineId) {
        if (confirm("Are you sure you want to delete this routine? This action cannot be undone.")) {
            routines = routines.filter(r => r.id !== routineId);
            saveRoutines();
            renderRoutineList();
            showView(routineListView);
        }
    }

    function prepareRoutineEditor(routineId = null) {
        routineForm.reset();
        editorExercisesContainer.innerHTML = '';
        if (routineId) {
            const routine = routines.find(r => r.id === routineId);
            if (!routine) { showView(routineListView); return; }
            editorViewTitle.textContent = "Edit Routine";
            editorRoutineIdInput.value = routine.id;
            editorRoutineNameInput.value = routine.name;
            editorRoutineDescriptionInput.value = routine.description || '';
            routine.exercises.forEach(exData => addExerciseToForm(exData));
        } else {
            editorViewTitle.textContent = "Create New Routine";
            editorRoutineIdInput.value = '';
            addExerciseToForm();
        }
        updateExerciseNumbers();
        showView(routineEditorView);
        editorRoutineNameInput.focus();
    }

    function addExerciseToForm(exerciseData = {}) {
        const templateContent = exerciseFormTemplate.content.cloneNode(true);
        const exerciseItem = templateContent.querySelector('.exercise-form-item');
        exerciseItem.querySelector('.exercise-name-input').value = exerciseData.name || '';
        exerciseItem.querySelector('.exercise-sets-input').value = exerciseData.sets || 2;
        exerciseItem.querySelector('.exercise-reps-input').value = exerciseData.reps || '10-15';
        exerciseItem.querySelector('.exercise-rest-between-sets-input').value = exerciseData.restBetweenSets === undefined ? 75 : exerciseData.restBetweenSets;
        exerciseItem.querySelector('.exercise-rest-after-exercise-input').value = exerciseData.restAfterExercise === undefined ? 105 : exerciseData.restAfterExercise;
        exerciseItem.querySelector('.exercise-notes-input').value = exerciseData.notes || '';
        exerciseItem.querySelector('.remove-exercise-btn').addEventListener('click', (e) => { e.target.closest('.exercise-form-item').remove(); updateExerciseNumbers(); });
        editorExercisesContainer.appendChild(exerciseItem);
        updateExerciseNumbers();
    }

    function updateExerciseNumbers() {
        editorExercisesContainer.querySelectorAll('.exercise-form-item').forEach((item, index) => {
            item.querySelector('.exercise-number').textContent = index + 1;
        });
    }

    function handleSaveRoutine(event) {
        event.preventDefault();
        const routineId = editorRoutineIdInput.value;
        const newRoutineData = {
            id: routineId || `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: editorRoutineNameInput.value.trim(),
            description: editorRoutineDescriptionInput.value.trim(),
            exercises: []
        };
        if (!newRoutineData.name) { alert("Routine name is required."); editorRoutineNameInput.focus(); return; }
        const exerciseItems = editorExercisesContainer.querySelectorAll('.exercise-form-item');
        if (exerciseItems.length === 0) { alert("A routine must have at least one exercise."); return; }
        let exercisesValid = true;
        for (let i = 0; i < exerciseItems.length; i++) {
            const item = exerciseItems[i];
            const nameInput = item.querySelector('.exercise-name-input'), name = nameInput.value.trim();
            const setsInput = item.querySelector('.exercise-sets-input'), sets = parseInt(setsInput.value);
            const repsInput = item.querySelector('.exercise-reps-input'), reps = repsInput.value.trim();
            const restBtwInput = item.querySelector('.exercise-rest-between-sets-input'), restBtw = parseInt(restBtwInput.value);
            const restAfterInput = item.querySelector('.exercise-rest-after-exercise-input'), restAfter = parseInt(restAfterInput.value);
            if (!name) { alert(`Exercise Name is required for Exercise ${i + 1}.`); nameInput.focus(); exercisesValid = false; break; }
            if (!reps) { alert(`Reps are required for Exercise ${i + 1}.`); repsInput.focus(); exercisesValid = false; break; }
            if (isNaN(sets) || sets < 1) { alert(`Sets must be a positive number for Exercise ${i + 1}.`); setsInput.focus(); exercisesValid = false; break; }
            if (isNaN(restBtw) || restBtw < 0) { alert(`Rest Between Sets must be a non-negative number for Exercise ${i + 1}.`); restBtwInput.focus(); exercisesValid = false; break; }
            if (isNaN(restAfter) || restAfter < 0) { alert(`Rest After Exercise must be a non-negative number for Exercise ${i + 1}.`); restAfterInput.focus(); exercisesValid = false; break; }
            newRoutineData.exercises.push({
                id: `ex_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
                name: name, sets: sets, reps: reps, restBetweenSets: restBtw, restAfterExercise: restAfter, notes: item.querySelector('.exercise-notes-input').value.trim()
            });
        }
        if (!exercisesValid) return;
        if (routineId) {
            const index = routines.findIndex(r => r.id === routineId);
            if (index > -1) routines[index] = newRoutineData; else routines.push(newRoutineData);
        } else {
            routines.push(newRoutineData);
        }
        saveRoutines();
        renderRoutineList();
        showView(routineListView);
    }

    function startWorkout(routineId) {
        const routine = routines.find(r => r.id === routineId);
        if (!routine) { console.error("Routine not found:", routineId); return; }
        currentWorkout.routine = routine;
        currentWorkout.currentExerciseIndex = 0;
        currentWorkout.currentSet = 1;
        currentWorkout.isResting = false;
        if (currentWorkout.timerInterval) clearInterval(currentWorkout.timerInterval);
        updatePlayerUI();
        showView(workoutPlayerView);
    }

    function updatePlayerUI() {
        if (!currentWorkout.routine || !currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex]) { workoutComplete(); return; }
        const exercise = currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];
        playerRoutineName.textContent = currentWorkout.routine.name;
        playerExerciseName.textContent = exercise.name;
        playerCurrentSet.textContent = currentWorkout.currentSet;
        playerTotalSets.textContent = exercise.sets;
        playerRepsTarget.textContent = exercise.reps;
        playerExerciseNotes.textContent = exercise.notes || "No specific notes.";
        playerSetActionBtn.textContent = "Mark Set Complete";
        playerSetActionBtn.disabled = false;
        playerTimerDisplay.style.display = 'none';
        playerNextExerciseBtn.style.display = 'none';
    }

    function handleSetComplete() {
        const exercise = currentWorkout.routine.exercises[currentWorkout.currentExerciseIndex];
        if (currentWorkout.currentSet < exercise.sets) {
            currentWorkout.currentSet++;
            startTimer(exercise.restBetweenSets, 'betweenSets');
        } else {
            if (currentWorkout.currentExerciseIndex < currentWorkout.routine.exercises.length - 1) {
                startTimer(exercise.restAfterExercise, 'afterExercise');
            } else {
                workoutComplete();
            }
        }
    }

    function startTimer(duration, type) {
        currentWorkout.isResting = true;
        playerSetActionBtn.disabled = true;
        playerTimerDisplay.style.display = 'block';
        let timeLeft = duration;
        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            playerTimerValue.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        function timerTick() {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft < 0) {
                clearInterval(currentWorkout.timerInterval);
                if (!isMuted) {
                    document.getElementById('timer-sound').play();
                }
                currentWorkout.isResting = false;
                playerTimerDisplay.style.display = 'none';
                playerSetActionBtn.disabled = false;
                if (type === 'betweenSets') {
                    updatePlayerUI();
                } else if (type === 'afterExercise') {
                    playerNextExerciseBtn.style.display = 'inline-block';
                    playerNextExerciseBtn.focus();
                }
            }
        }
        updateTimerDisplay();
        currentWorkout.timerInterval = setInterval(timerTick, 1000);
    }

    function handleNextExercise() {
        if (currentWorkout.timerInterval) clearInterval(currentWorkout.timerInterval);
        currentWorkout.isResting = false;
        currentWorkout.currentExerciseIndex++;
        currentWorkout.currentSet = 1;
        if (currentWorkout.currentExerciseIndex >= currentWorkout.routine.exercises.length) {
            workoutComplete();
        } else {
            updatePlayerUI();
        }
    }

    function workoutComplete() {
        if (currentWorkout.timerInterval) clearInterval(currentWorkout.timerInterval);
        alert("Workout Complete! Well done!");
        resetWorkoutState();
        showView(routineListView);
    }

    function resetWorkoutState() {
        currentWorkout.routine = null;
        currentWorkout.currentExerciseIndex = 0;
        currentWorkout.currentSet = 1;
        currentWorkout.isResting = false;
        if (currentWorkout.timerInterval) clearInterval(currentWorkout.timerInterval);
        currentWorkout.timerInterval = null;
        currentWorkout.routineToStart = null;
    }
    
    function initializeMuteButton() {
        const savedMuteState = localStorage.getItem('isMuted');
        isMuted = savedMuteState === 'true';
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem('isMuted', isMuted);
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        });
    }

    // --- Event Listeners ---
    playerSetActionBtn.addEventListener('click', () => { if (!currentWorkout.isResting) { handleSetComplete(); } });
    playerNextExerciseBtn.addEventListener('click', handleNextExercise);
    playerEndWorkoutBtn.addEventListener('click', () => { if (confirm("Are you sure you want to end this workout?")) { resetWorkoutState(); showView(routineListView); } });
    confirmWarmupBtn.addEventListener('click', () => { warmupModal.style.display = 'none'; if (currentWorkout.routineToStart) { startWorkout(currentWorkout.routineToStart); } });
    cancelWarmupBtn.addEventListener('click', () => { warmupModal.style.display = 'none'; currentWorkout.routineToStart = null; });
    editorAddExerciseBtn.addEventListener('click', () => addExerciseToForm());
    routineForm.addEventListener('submit', handleSaveRoutine);
    editorCancelBtn.addEventListener('click', () => { if (confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) { showView(routineListView); } });
    createNewRoutineBtn.addEventListener('click', () => { prepareRoutineEditor(); });

    // --- Initialization ---
    initializeMuteButton();
    loadRoutines();
    renderRoutineList();
    showView(routineListView);
});