package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

type Task struct {
	ID        int       `json:"id"`
	Text      string    `json:"text"`
	Progress  int       `json:"progress"`
	Deadline  string    `json:"deadline"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"createdAt"`
}

var (
	tasks  []Task
	mutex  sync.Mutex
	nextID = 1
)

const dataFile = "tasks.json"

func loadTasks() {
	file, err := os.ReadFile(dataFile)
	if err == nil {
		json.Unmarshal(file, &tasks)
		for _, t := range tasks {
			if t.ID >= nextID {
				nextID = t.ID + 1
			}
		}
	}
}

func saveTasks() {
	data, _ := json.MarshalIndent(tasks, "", "  ")
	os.WriteFile(dataFile, data, 0644)
}

func getTasks(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()
	json.NewEncoder(w).Encode(tasks)
}

func createTask(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	var t Task
	json.NewDecoder(r.Body).Decode(&t)
	t.ID = nextID
	t.CreatedAt = time.Now()
	nextID++
	tasks = append(tasks, t)
	saveTasks()
	json.NewEncoder(w).Encode(t)
}

func updateTask(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)

	for i, t := range tasks {
		if t.ID == id {
			json.NewDecoder(r.Body).Decode(&tasks[i])
			tasks[i].ID = id
			tasks[i].CreatedAt = t.CreatedAt
			saveTasks()
			json.NewEncoder(w).Encode(tasks[i])
			return
		}
	}
	http.NotFound(w, r)
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)

	for i, t := range tasks {
		if t.ID == id {
			tasks = append(tasks[:i], tasks[i+1:]...)
			saveTasks()
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	http.NotFound(w, r)
}

func main() {
	loadTasks()

	r := mux.NewRouter()
	r.HandleFunc("/api/tasks", getTasks).Methods("GET")
	r.HandleFunc("/api/tasks", createTask).Methods("POST")
	r.HandleFunc("/api/tasks/{id}", updateTask).Methods("PUT")
	r.HandleFunc("/api/tasks/{id}", deleteTask).Methods("DELETE")

	fs := http.FileServer(http.Dir("./static"))
	r.PathPrefix("/").Handler(fs)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // ローカル開発用のデフォルト
	}
	http.ListenAndServe(":"+port, r)

}
