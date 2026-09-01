import json
import yaml
import os

def update_openapi():
    yaml_path = "openapi.yaml"
    with open(yaml_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    # 1. Update Tags
    batch_tag = {
        "name": "Batch",
        "description": "High-performance Redis-first batch entity lookups (users, posts, events, games) preventing client-side Firestore read spikes"
    }
    tag_names = [t["name"] for t in spec.get("tags", [])]
    if "Batch" not in tag_names:
        spec["tags"].append(batch_tag)

    # 2. Add Schemas in components
    schemas = spec.setdefault("components", {}).setdefault("schemas", {})
    
    schemas["BatchIdsRequest"] = {
        "type": "object",
        "required": ["ids"],
        "properties": {
            "ids": {
                "type": "array",
                "description": "Array of document IDs to fetch",
                "items": {"type": "string"},
                "example": ["0qLgNmU9e3ZKLU5rbjEnuLaxCw33", "0Qjy0VXKJmhOJZom5MoGCgzWmb23"]
            }
        }
    }

    schemas["MultiBatchRequest"] = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "items": {"type": "string"},
                "example": ["user_id_1", "user_id_2"]
            },
            "posts": {
                "type": "array",
                "items": {"type": "string"},
                "example": ["post_id_1", "post_id_2"]
            },
            "events": {
                "type": "array",
                "items": {"type": "string"},
                "example": ["event_id_1"]
            },
            "games": {
                "type": "array",
                "items": {"type": "string"},
                "example": ["game_id_1"]
            }
        }
    }

    schemas["BatchMeta"] = {
        "type": "object",
        "properties": {
            "totalRequested": {"type": "integer", "example": 2},
            "cachedCount": {"type": "integer", "example": 2},
            "fetchedFromDbCount": {"type": "integer", "example": 0}
        }
    }

    schemas["BatchResponse"] = {
        "type": "object",
        "properties": {
            "status": {"type": "string", "enum": ["SUCCESS"], "example": "SUCCESS"},
            "count": {"type": "integer", "example": 2},
            "data": {
                "type": "array",
                "items": {"type": "object"}
            },
            "meta": {"$ref": "#/components/schemas/BatchMeta"}
        }
    }

    schemas["MultiBatchResponse"] = {
        "type": "object",
        "properties": {
            "status": {"type": "string", "enum": ["SUCCESS"], "example": "SUCCESS"},
            "data": {
                "type": "object",
                "properties": {
                    "users": {"type": "array", "items": {"$ref": "#/components/schemas/User"}},
                    "posts": {"type": "array", "items": {"$ref": "#/components/schemas/Post"}},
                    "events": {"type": "array", "items": {"$ref": "#/components/schemas/Event"}},
                    "games": {"type": "array", "items": {"$ref": "#/components/schemas/Event"}}
                }
            },
            "meta": {
                "type": "object",
                "properties": {
                    "cachedCount": {"type": "integer", "example": 5},
                    "fetchedFromDbCount": {"type": "integer", "example": 0}
                }
            }
        }
    }

    # 3. Add Paths
    paths = spec.setdefault("paths", {})

    paths["/api/batch"] = {
        "post": {
            "tags": ["Batch"],
            "summary": "Universal Multi-Entity Batch Fetch",
            "description": "Fetches multiple entities (users, posts, events, games) in a single request. Utilizes Redis-first caching (1-hour TTL). Only IDs that are cache misses are fetched from Firestore and cached automatically.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/MultiBatchRequest"}
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Batch fetch results with cache performance metadata",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/MultiBatchResponse"}
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/400BadRequest"},
                "500": {"$ref": "#/components/responses/500InternalServerError"}
            }
        }
    }

    paths["/api/batch/{type}"] = {
        "post": {
            "tags": ["Batch"],
            "summary": "Type-Specific Batch Fetch",
            "description": "Batch fetches items for a given entity type (`users`, `posts`, `events`, `games`) by ID. Checks Upstash Redis cache first (1-hour TTL); fetches missing items from Firestore and populates Redis.",
            "parameters": [
                {
                    "name": "type",
                    "in": "path",
                    "required": True,
                    "description": "Entity type to fetch",
                    "schema": {
                        "type": "string",
                        "enum": ["users", "posts", "events", "games"],
                        "example": "users"
                    }
                }
            ],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BatchIdsRequest"}
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "List of resolved entities",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/BatchResponse"}
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/400BadRequest"},
                "500": {"$ref": "#/components/responses/500InternalServerError"}
            }
        }
    }

    paths["/api/users/batch"] = {
        "post": {
            "tags": ["Users", "Batch"],
            "summary": "Batch Get Users (Redis-first)",
            "description": "Retrieves multiple user profiles by array of IDs. Checks Redis `user:profile:{id}` (1-hour TTL) before querying Firestore.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BatchIdsRequest"}
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Array of user profiles",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/BatchResponse"}
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/400BadRequest"},
                "500": {"$ref": "#/components/responses/500InternalServerError"}
            }
        }
    }

    paths["/api/posts/batch"] = {
        "post": {
            "tags": ["Posts", "Batch"],
            "summary": "Batch Get Posts (Redis-first)",
            "description": "Retrieves multiple posts by array of IDs. Checks Redis `post:{id}` (1-hour TTL) before querying Firestore.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BatchIdsRequest"}
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Array of post objects",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/BatchResponse"}
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/400BadRequest"},
                "500": {"$ref": "#/components/responses/500InternalServerError"}
            }
        }
    }

    paths["/api/events/batch"] = {
        "post": {
            "tags": ["Events", "Batch"],
            "summary": "Batch Get Events (Redis-first)",
            "description": "Retrieves multiple events by array of IDs. Checks Redis `event:{id}` (1-hour TTL) before querying Firestore.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BatchIdsRequest"}
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Array of event objects",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/BatchResponse"}
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/400BadRequest"},
                "500": {"$ref": "#/components/responses/500InternalServerError"}
            }
        }
    }

    paths["/api/games/batch"] = {
        "post": {
            "tags": ["Games", "Batch"],
            "summary": "Batch Get Games (Redis-first)",
            "description": "Retrieves multiple games by array of IDs. Checks Redis `event:{id}` (1-hour TTL) before querying Firestore.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/BatchIdsRequest"}
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Array of game objects",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/BatchResponse"}
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/400BadRequest"},
                "500": {"$ref": "#/components/responses/500InternalServerError"}
            }
        }
    }

    # 4. Save YAML and JSON files
    targets = [
        ("openapi.yaml", "openapi.json"),
        ("documentation/openapi.yaml", "documentation/openapi.json")
    ]

    for y_file, j_file in targets:
        os.makedirs(os.path.dirname(y_file) or ".", exist_ok=True)
        with open(y_file, "w", encoding="utf-8") as f:
            yaml.dump(spec, f, sort_keys=False, allow_unicode=True)
        
        with open(j_file, "w", encoding="utf-8") as f:
            json.dump(spec, f, indent=2, ensure_ascii=False)
        print(f"Updated {y_file} and {j_file}")

if __name__ == "__main__":
    update_openapi()
