let tasks = [];

flatpickr("#deadlineInput", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  time_24hr: true
});

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  tasks = await res.json();
    // 修正処理：progress < 100 なのに completed が true の場合は false に戻す
  for (const task of tasks) {
    if (task.completed && task.progress < 100) {
      task.completed = false;
      await updateTask(task); // サーバーにも反映
    }
  }
  renderTasks();
}

function renderTasks() {
  const taskList = document.getElementById('taskList');
  const completedList = document.getElementById('completedList');
  taskList.innerHTML = '';
  completedList.innerHTML = '';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';

    const title = document.createElement('div');
    title.textContent = task.text || '(無題)';
    li.appendChild(title);

    if (task.deadline) {
      const deadline = document.createElement('div');
      deadline.textContent = '期限: ' + task.deadline;
      li.appendChild(deadline);
    }

    const progress = document.createElement('input');
    progress.type = 'range';
    progress.min = 0;
    progress.max = 100;
    progress.value = task.progress || 0;

    const valueLabel = document.createElement('div');
    valueLabel.textContent = progress.value + '%';

    progress.oninput = () => {
      valueLabel.textContent = progress.value + '%';
    };

    progress.onchange = async () => {
      task.progress = parseInt(progress.value);
      await updateTask(task);
      if (task.progress === 100 && !task.completed) {
        task.completed = true;
        await updateTask(task);
      }
      fetchTasks();
    };

    li.appendChild(progress);
    li.appendChild(valueLabel);

    const btnGroup = document.createElement('div');

    if (!task.completed) {
      const completeBtn = document.createElement('button');
      completeBtn.textContent = '完了';
      completeBtn.onclick = async () => {
        task.progress = 100;
        task.completed = true;
        await updateTask(task);
        fetchTasks();
      };
      btnGroup.appendChild(completeBtn);
    } else {
      const undoBtn = document.createElement('button');
      undoBtn.textContent = '元に戻す';
      undoBtn.onclick = async () => {
        task.completed = false;
        task.progress = 0;
        await updateTask(task);
        fetchTasks();
      };
      btnGroup.appendChild(undoBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.textContent = '編集';
    editBtn.onclick = () => showEditPopup(task);
    btnGroup.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.onclick = async () => {
      await fetch('/api/tasks/' + task.id, { method: 'DELETE' });
      fetchTasks();
    };
    btnGroup.appendChild(deleteBtn);

    li.appendChild(btnGroup);

    if (task.completed) {
      completedList.appendChild(li);
    } else {
      taskList.appendChild(li);
    }
  });
}

async function addTask() {
  const text = document.getElementById('taskInput').value.trim();
  const deadline = document.getElementById('deadlineInput').value;

  if (!text) {
    alert("タスク内容を入力してください");
    return;
  }

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, deadline, progress: 0, completed: false })
  });

  document.getElementById('taskInput').value = '';
  document.getElementById('deadlineInput').value = '';
  fetchTasks();
}

async function updateTask(task) {
  await fetch('/api/tasks/' + task.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
}

function showEditPopup(task) {
  const popup = document.createElement('div');
  popup.className = 'popup';

  const content = document.createElement('div');
  content.className = 'popup-content';

  const deadlineInput = document.createElement('input');
  deadlineInput.type = 'text';
  deadlineInput.value = task.deadline || '';
  flatpickr(deadlineInput, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.onclick = async () => {
    task.deadline = deadlineInput.value;
    await updateTask(task);
    document.body.removeChild(popup);
    fetchTasks();
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.onclick = () => {
    document.body.removeChild(popup);
  };

  content.appendChild(document.createTextNode('期限を編集:'));
  content.appendChild(deadlineInput);
  content.appendChild(saveBtn);
  content.appendChild(cancelBtn);
  popup.appendChild(content);
  document.body.appendChild(popup);
}

fetchTasks();
