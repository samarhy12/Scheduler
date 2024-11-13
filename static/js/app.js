// static/js/app.js
new Vue({
  el: "#app",
  data: {
    tasks: [],
    newTask: {
      name: "",
      day: "",
      startTime: "",
      endTime: "",
      color: "#4CAF50",
    },
    scheduleName: "My Schedule",
    days: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    colors: ["#4CAF50", "#2196F3", "#F44336", "#FFC107", "#9C27B0", "#FF5722"],
    selectedColor: "#4CAF50",
    savedSchedules: [],
    currentScheduleId: null,
    errorMessage: "",
    successMessage: "",
  },
  mounted() {
    this.loadSavedSchedules();
  },
  methods: {
    addTask() {
      if (this.validateTask()) {
        this.tasks.push({ ...this.newTask, color: this.selectedColor });
        this.resetNewTask();
        this.successMessage = "Task added successfully!";
      }
    },
    validateTask() {
      if (
        !this.newTask.name ||
        !this.newTask.day ||
        !this.newTask.startTime ||
        !this.newTask.endTime
      ) {
        this.errorMessage = "Please fill in all task fields.";
        return false;
      }
      if (this.newTask.startTime >= this.newTask.endTime) {
        this.errorMessage = "End time must be after start time.";
        return false;
      }
      this.errorMessage = "";
      return true;
    },
    resetNewTask() {
      this.newTask = {
        name: "",
        day: "",
        startTime: "",
        endTime: "",
        color: "#4CAF50",
      };
    },
    getTasksForDay(day) {
      return this.tasks.filter((task) => task.day === day);
    },
    selectColor(color) {
      this.selectedColor = color;
    },
    saveSchedule() {
      if (this.scheduleName.trim() === "") {
        this.errorMessage = "Please enter a schedule name.";
        return;
      }
      fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.scheduleName,
          tasks: this.tasks,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          this.currentScheduleId = data.id;
          this.successMessage = "Schedule saved successfully!";
          this.loadSavedSchedules();
        })
        .catch((error) => {
          console.error("Error:", error);
          this.errorMessage = "An error occurred while saving the schedule.";
        });
    },
    loadSavedSchedules() {
      fetch("/api/schedules")
        .then((response) => response.json())
        .then((data) => {
          this.savedSchedules = Object.entries(data).map(([id, schedule]) => ({
            id,
            name: schedule.name,
          }));
        })
        .catch((error) => {
          console.error("Error:", error);
          this.errorMessage = "Failed to load saved schedules.";
        });
    },
    loadSchedule(scheduleId) {
      fetch(`/api/schedules/${scheduleId}`)
        .then((response) => response.json())
        .then((data) => {
          this.scheduleName = data.name;
          this.tasks = data.tasks;
          this.currentScheduleId = scheduleId;
          this.successMessage = "Schedule loaded successfully!";
        })
        .catch((error) => {
          console.error("Error:", error);
          this.errorMessage = "An error occurred while loading the schedule.";
        });
    },
    deleteSchedule(scheduleId) {
      if (confirm("Are you sure you want to delete this schedule?")) {
        fetch(`/api/schedules/${scheduleId}`, {
          method: "DELETE",
        })
          .then((response) => response.json())
          .then((data) => {
            this.successMessage = "Schedule deleted successfully!";
            this.loadSavedSchedules();
            if (this.currentScheduleId === scheduleId) {
              this.resetSchedule();
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            this.errorMessage =
              "An error occurred while deleting the schedule.";
          });
      }
    },
    resetSchedule() {
      this.tasks = [];
      this.scheduleName = "My Schedule";
      this.currentScheduleId = null;
      this.successMessage = "Created a new schedule.";
    },
    downloadSchedule() {
      if (this.currentScheduleId) {
        window.open(`/download/${this.currentScheduleId}`, "_blank");
      } else if (this.scheduleName.trim() !== "") {
        this.saveSchedule();
        setTimeout(() => {
          if (this.currentScheduleId) {
            window.open(`/download/${this.currentScheduleId}`, "_blank");
          }
        }, 1000);
      } else {
        this.errorMessage = "Please enter a schedule name before downloading.";
      }
    },
  },
  template: `
        <div>
            <h2>Create Your Schedule</h2>
            <p class="instruction">Fill in the details below to create your schedule. Add tasks, save your schedule, and download it as a PDF.</p>
            
            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
            
            <div class="form-group">
                <label for="schedule-name">Schedule Name:</label>
                <input id="schedule-name" v-model="scheduleName" required placeholder="Enter schedule name">
            </div>
            <div class="form-group">
                <label for="task-name">Task Name:</label>
                <input id="task-name" v-model="newTask.name" required placeholder="Enter task name">
            </div>
            <div class="form-group">
                <label for="task-day">Day:</label>
                <select id="task-day" v-model="newTask.day" required>
                    <option value="" disabled selected>Select a day</option>
                    <option v-for="day in days" :value="day">{{ day }}</option>
                </select>
            </div>
            <div class="form-group">
                <label for="start-time">Start Time:</label>
                <input id="start-time" type="time" v-model="newTask.startTime" required>
            </div>
            <div class="form-group">
                <label for="end-time">End Time:</label>
                <input id="end-time" type="time" v-model="newTask.endTime" required>
            </div>
            <div class="form-group">
                <label>Color:</label>
                <div class="color-picker">
                    <div v-for="color in colors" 
                         :style="{ backgroundColor: color }"
                         :class="['color-option', { selected: color === selectedColor }]"
                         @click="selectColor(color)"></div>
                </div>
            </div>
            <button @click="addTask">Add Task</button>
            
            <div v-if="tasks.length > 0" class="schedule">
                <div class="schedule-header">Your Schedule: {{ scheduleName }}</div>
                <div class="schedule-body">
                    <div v-for="day in days" class="schedule-cell schedule-day">{{ day }}</div>
                    <template v-for="day in days">
                        <div v-for="task in getTasksForDay(day)" 
                             class="schedule-cell"
                             :style="{ backgroundColor: task.color }">
                            <div class="schedule-time">{{ task.startTime }} - {{ task.endTime }}</div>
                            <div>{{ task.name }}</div>
                        </div>
                    </template>
                </div>
            </div>
            <div v-else class="empty-schedule">
                <p>Your schedule is empty. Add tasks to see them here.</p>
            </div>
            
            <button @click="saveSchedule">Save Schedule</button>
            <button @click="downloadSchedule">Download Schedule PDF</button>
            <button @click="resetSchedule">Create New Schedule</button>
            
            <h3>Saved Schedules</h3>
            <ul v-if="savedSchedules.length > 0">
                <li v-for="schedule in savedSchedules">
                    {{ schedule.name }}
                    <button @click="loadSchedule(schedule.id)">Load</button>
                    <button @click="deleteSchedule(schedule.id)">Delete</button>
                </li>
            </ul>
            <p v-else>No saved schedules yet.</p>
        </div>
    `,
});
