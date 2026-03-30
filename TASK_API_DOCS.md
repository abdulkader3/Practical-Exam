# Task API Documentation

## Base URL
```
http://localhost:4000/api/tasks
```

## Authentication
All task endpoints require authentication. Include the access token in:
- **Header**: `Authorization: Bearer <token>`
- **Cookie**: `accessToken` (automatically sent)

---

## Endpoints

### 1. Create Task
**POST** `/`

```json
we createde middleware for role checking
```

**Response:**
```json
{
  "success": true,
  "data": { "task": { ... } }
}
```

---

### 2. Get All Tasks
**GET** `/`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| priority | string | Filter by priority |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Example:** `/api/tasks?status=pending&priority=high&page=1&limit=10`

---

### 3. Get Task by ID
**GET** `/:id`

**Example:** `/api/tasks/65f1234567890abcdef1234`

---

### 4. Update Task
**PUT** `/:id`

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "completed",
  "priority": "high",
  "dueDate": "2026-05-01T00:00:00.000Z",
  "tags": [{ "name": "done", "color": "#22c55e" }],
  "assignedTo": "new_user_id"
}
```

**Note:** Only the task creator or admin can update.

---

### 5. Delete Task
**DELETE** `/:id`

**Note:** Only the task creator or admin can delete.

---

### 6. Add Comment
**POST** `/:id/comments`

```json
{
  "content": "This is a comment"
}
```

---

### 7. Delete Comment
**DELETE** `/:id/comments/:commentId`

**Note:** Only the comment author or admin can delete.

---

## Enums

### Status
- `pending`
- `in-progress`
- `completed`
- `cancelled`

### Priority
- `low`
- `medium`
- `high`
- `urgent`

---

## Postman Setup

1. **Login** to get access token:
   - **POST** `/api/auth/login`
   - Body: `{ "email": "user@example.com", "password": "password123" }`

2. **Copy** the `accessToken` from response

3. **Configure** in Postman:
   - Go to **Headers** tab
   - Add: `Authorization` = `Bearer <paste_token>`

4. **Test** endpoints at `/api/tasks`
