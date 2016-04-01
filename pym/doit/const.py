

NODE_NAME_DOIT = 'doit'

# /api/rest/doit/v1/tasks?tenant_id&user_id
NODE_NAME_API_DOIT = 'doit'
NODE_NAME_API_DOIT_V1 = 'v1'

# list:          GET    /api/rest/doit/v1/tasks       ? {tenant_id} & {user_id}
# list assigned: GET    /api/rest/doit/v1/tasks       ? {tenant_id} & {user_id} & {which}
#                                                        which=assigned
# get:           GET    /api/rest/doit/v1/tasks/{id}  ? {tenant_id} & {user_id}
# insert:        POST   /api/rest/doit/v1/tasks       ? {tenant_id} & {user_id}
#                       {body}
# update:        PUT    /api/rest/doit/v1/tasks/{id}  ? {tenant_id} & {user_id}
#                       {body}
# delete:        DELETE /api/rest/doit/v1/tasks/{id}  ? {tenant_id} & {user_id}
NODE_NAME_API_DOIT_V1_TASKS = 'tasks'


NODE_NAME_API_DOIT_V1_TASKS_CLEAR = 'clear'
NODE_NAME_API_DOIT_V1_TASKS_HIDE = 'hide'

# list:          GET    /api/rest/doit/v1/assignees/{task_id}                ? {tenant_id} & {user_id}
# get:           GET    /api/rest/doit/v1/assignees/{task_id}/{assignee_id}  ? {tenant_id} & {user_id}
# insert:        POST   /api/rest/doit/v1/assignees/{task_id}                ? {tenant_id} & {user_id}
#                       {body}
# update:        PUT    /api/rest/doit/v1/assignees/{task_id}/{assignee_id}  ? {tenant_id} & {user_id}
#                       {body}
# delete:        DELETE /api/rest/doit/v1/assignees/{task_id}/{assignee_id}  ? {tenant_id} & {user_id}
NODE_NAME_API_DOIT_V1_ASSIGNEES = 'assignees'
