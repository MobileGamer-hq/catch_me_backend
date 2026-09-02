import json
import yaml
import os

def update_openapi():
    yaml_path = "openapi.yaml"
    with open(yaml_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    # 1. Update Tags
    tags = spec.setdefault("tags", [])
    tag_names = [t["name"] for t in tags]

    new_tags = [
        {
            "name": "QR & Links",
            "description": "High-performance PNG QR code generation, Base64 Data URLs, and LinkUtils parity parsing for mobile and web deep links."
        },
        {
            "name": "Scout & Organizer",
            "description": "Tablet-friendly interactive web view, daily performance summaries, official match verification sheets, and athlete scouting dossiers in PDF/CSV formats."
        }
    ]

    for nt in new_tags:
        if nt["name"] not in tag_names:
            tags.append(nt)

    # 2. Schemas in components
    schemas = spec.setdefault("components", {}).setdefault("schemas", {})

    schemas["QrGenerateRequest"] = {
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "enum": ["profile", "game", "lineup", "stats", "post", "challenge"],
                "description": "Catch Me entity type",
                "example": "profile"
            },
            "id": {
                "type": "string",
                "description": "Entity ID",
                "example": "xfNhoQ65r8cqYL8P8hGt6lw6SJr2"
            },
            "url": {
                "type": "string",
                "description": "Raw URL to encode (optional if type and id provided)",
                "example": "https://app.catchme.live/profile?id=xfNhoQ65r8cqYL8P8hGt6lw6SJr2"
            },
            "size": {
                "type": "integer",
                "description": "QR code dimension in pixels",
                "default": 300,
                "example": 320
            },
            "margin": {
                "type": "integer",
                "description": "Quiet zone margin around the QR code",
                "default": 1
            },
            "dark": {
                "type": "string",
                "description": "Dark module hex color",
                "default": "#1E1B4B"
            },
            "light": {
                "type": "string",
                "description": "Background light module hex color",
                "default": "#FFFFFF"
            }
        }
    }

    schemas["QrGenerateResponse"] = {
        "type": "object",
        "properties": {
            "status": {"type": "string", "example": "SUCCESS"},
            "link": {"type": "string", "example": "https://app.catchme.live/profile?id=xfNhoQ65r8cqYL8P8hGt6lw6SJr2"},
            "dataUrl": {"type": "string", "description": "Base64 PNG data URL"},
            "qrImageUrl": {"type": "string", "example": "https://api.catchme.live/api/qr?url=..."}
        }
    }

    schemas["QrParseResponse"] = {
        "type": "object",
        "properties": {
            "status": {"type": "string", "example": "SUCCESS"},
            "link": {"type": "string", "example": "https://app.catchme.live/game?id=game123&tab=lineup"},
            "type": {"type": "string", "example": "game"},
            "id": {"type": "string", "example": "game123"}
        }
    }

    schemas["DailySummaryResponse"] = {
        "type": "object",
        "properties": {
            "status": {"type": "string", "example": "SUCCESS"},
            "date": {"type": "string", "example": "2026-09-02"},
            "sport": {"type": "string", "example": "Football"},
            "tournamentName": {"type": "string", "example": "Catch Me National Cup"},
            "kpis": {
                "type": "object",
                "properties": {
                    "totalGames": {"type": "integer", "example": 8},
                    "totalGoals": {"type": "integer", "example": 21},
                    "totalYellowCards": {"type": "integer", "example": 6},
                    "totalRedCards": {"type": "integer", "example": 1},
                    "totalPerformers": {"type": "integer", "example": 44}
                }
            },
            "games": {"type": "array", "items": {"type": "object"}},
            "performers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "teamName": {"type": "string"},
                        "sport": {"type": "string"},
                        "rating": {"type": "number"},
                        "goals": {"type": "integer"},
                        "points": {"type": "integer"},
                        "assists": {"type": "integer"},
                        "yellowCards": {"type": "integer"},
                        "redCards": {"type": "integer"},
                        "profileUrl": {"type": "string"}
                    }
                }
            },
            "cards": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "gameId": {"type": "string"},
                        "matchTitle": {"type": "string"},
                        "teamName": {"type": "string"},
                        "cardType": {"type": "string"},
                        "playerName": {"type": "string"},
                        "playerId": {"type": "string"},
                        "minute": {"type": "string"},
                        "reason": {"type": "string"}
                    }
                }
            },
            "goals": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "gameId": {"type": "string"},
                        "matchTitle": {"type": "string"},
                        "teamName": {"type": "string"},
                        "scorerName": {"type": "string"},
                        "scorerId": {"type": "string"},
                        "assistName": {"type": "string"},
                        "minute": {"type": "string"},
                        "type": {"type": "string"}
                    }
                }
            }
        }
    }

    # 3. Add Paths
    paths = spec.setdefault("paths", {})

    # QR Paths
    paths["/api/qr"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Generate QR Code (PNG Buffer or JSON)",
            "description": "Generates a PNG QR code buffer or JSON Data URL for any arbitrary URL, link, or Catch Me entity (type + id).",
            "parameters": [
                {"name": "url", "in": "query", "schema": {"type": "string"}, "description": "Direct URL to encode into QR"},
                {"name": "type", "in": "query", "schema": {"type": "string", "enum": ["profile", "game", "lineup", "stats", "post", "challenge"]}, "description": "Entity type"},
                {"name": "id", "in": "query", "schema": {"type": "string"}, "description": "Entity ID"},
                {"name": "format", "in": "query", "schema": {"type": "string", "enum": ["png", "json"], "default": "png"}, "description": "Output format"},
                {"name": "size", "in": "query", "schema": {"type": "integer", "default": 300}, "description": "QR code width/height in px"},
                {"name": "dark", "in": "query", "schema": {"type": "string", "default": "#1E1B4B"}, "description": "Dark module hex color"},
                {"name": "light", "in": "query", "schema": {"type": "string", "default": "#FFFFFF"}, "description": "Light module hex color"}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream or JSON with Base64 Data URL",
                    "content": {
                        "image/png": {"schema": {"type": "string", "format": "binary"}},
                        "application/json": {"schema": {"$ref": "#/components/schemas/QrGenerateResponse"}}
                    }
                },
                "400": {"description": "Missing parameters"}
            }
        }
    }

    paths["/api/qr/generate"] = {
        "post": {
            "tags": ["QR & Links"],
            "summary": "Generate QR Code via JSON Payload",
            "description": "Accepts entity parameters or raw URL in JSON body and returns base64 Data URL and CDN link.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {"schema": {"$ref": "#/components/schemas/QrGenerateRequest"}}
                }
            },
            "responses": {
                "200": {
                    "description": "QR Code metadata and Base64 Data URL",
                    "content": {
                        "application/json": {"schema": {"$ref": "#/components/schemas/QrGenerateResponse"}}
                    }
                },
                "400": {"description": "Invalid input"}
            }
        }
    }

    paths["/api/qr/parse"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Parse and Resolve Catch Me Deep Link",
            "description": "Parses URL query parameters and fragments (with mobile LinkUtils parity) to extract entity type and ID.",
            "parameters": [
                {"name": "link", "in": "query", "required": True, "schema": {"type": "string"}, "description": "Catch Me link to parse"}
            ],
            "responses": {
                "200": {
                    "description": "Resolved entity details",
                    "content": {
                        "application/json": {"schema": {"$ref": "#/components/schemas/QrParseResponse"}}
                    }
                }
            }
        },
        "post": {
            "tags": ["QR & Links"],
            "summary": "Parse and Resolve Catch Me Deep Link (POST)",
            "description": "Parses link from request body.",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["link"],
                            "properties": {"link": {"type": "string"}}
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Resolved entity details",
                    "content": {
                        "application/json": {"schema": {"$ref": "#/components/schemas/QrParseResponse"}}
                    }
                }
            }
        }
    }

    paths["/api/qr/profile/{userId}"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Get Athlete Profile QR Code PNG",
            "description": "Generates a PNG QR code linking directly to the athlete profile on the Catch Me mobile/web app (`https://app.catchme.live/profile?id={userId}`).",
            "parameters": [
                {"name": "userId", "in": "path", "required": True, "schema": {"type": "string"}},
                {"name": "size", "in": "query", "schema": {"type": "integer", "default": 320}}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream",
                    "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    paths["/api/qr/game/{gameId}"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Get Game Match Screen QR Code PNG",
            "description": "Generates a PNG QR code linking to the live game screen (`https://app.catchme.live/game?id={gameId}`).",
            "parameters": [
                {"name": "gameId", "in": "path", "required": True, "schema": {"type": "string"}},
                {"name": "size", "in": "query", "schema": {"type": "integer", "default": 320}}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream",
                    "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    paths["/api/qr/game/{gameId}/lineup"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Get Game Lineup Tab QR Code PNG",
            "description": "Generates a PNG QR code linking directly to the match lineups tab (`https://app.catchme.live/game?id={gameId}&tab=lineup`).",
            "parameters": [
                {"name": "gameId", "in": "path", "required": True, "schema": {"type": "string"}},
                {"name": "size", "in": "query", "schema": {"type": "integer", "default": 320}}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream",
                    "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    paths["/api/qr/game/{gameId}/stats"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Get Game Stats Tab QR Code PNG",
            "description": "Generates a PNG QR code linking directly to the match stats tab (`https://app.catchme.live/game?id={gameId}&tab=stats`).",
            "parameters": [
                {"name": "gameId", "in": "path", "required": True, "schema": {"type": "string"}},
                {"name": "size", "in": "query", "schema": {"type": "integer", "default": 320}}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream",
                    "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    paths["/api/qr/post/{postId}"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Get Post QR Code PNG",
            "description": "Generates a PNG QR code linking to a post (`https://app.catchme.live/post?id={postId}`).",
            "parameters": [
                {"name": "postId", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream",
                    "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    paths["/api/qr/challenge/{challengeId}"] = {
        "get": {
            "tags": ["QR & Links"],
            "summary": "Get Challenge QR Code PNG",
            "description": "Generates a PNG QR code linking to an event/challenge (`https://app.catchme.live/challenge?id={challengeId}`).",
            "parameters": [
                {"name": "challengeId", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "PNG image stream",
                    "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    # Scout & Organizer Paths
    paths["/api/scout/view"] = {
        "get": {
            "tags": ["Scout & Organizer"],
            "summary": "Scout & Organizer Tablet-Friendly Web View",
            "description": "Renders an interactive, responsive tablet-friendly HTML dashboard with date filters, KPI tiles, top performers, disciplinary log / cards, scoring timeline, and match verification downloads.",
            "parameters": [
                {"name": "date", "in": "query", "schema": {"type": "string", "format": "date"}, "description": "Target date filter (YYYY-MM-DD)"},
                {"name": "sport", "in": "query", "schema": {"type": "string"}, "description": "Sport filter (Football, Basketball, etc.)"},
                {"name": "tournamentId", "in": "query", "schema": {"type": "string"}, "description": "Tournament ID filter"}
            ],
            "responses": {
                "200": {
                    "description": "Responsive HTML Dashboard View",
                    "content": {"text/html": {"schema": {"type": "string"}}}
                }
            }
        }
    }

    paths["/api/organizer/view"] = {
        "get": {
            "tags": ["Scout & Organizer"],
            "summary": "Organizer Dashboard Alias",
            "description": "Direct alias for `/api/scout/view`.",
            "responses": {
                "200": {
                    "description": "Responsive HTML Dashboard View",
                    "content": {"text/html": {"schema": {"type": "string"}}}
                }
            }
        }
    }

    paths["/api/scout/daily-summary"] = {
        "get": {
            "tags": ["Scout & Organizer"],
            "summary": "Get Daily Summary Data (JSON)",
            "description": "Returns aggregated match results, calculated top performers, disciplinary cards, and goal scoring records for a given date/tournament.",
            "parameters": [
                {"name": "date", "in": "query", "schema": {"type": "string", "format": "date"}},
                {"name": "sport", "in": "query", "schema": {"type": "string"}},
                {"name": "tournamentId", "in": "query", "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "Aggregated daily summary data",
                    "content": {
                        "application/json": {"schema": {"$ref": "#/components/schemas/DailySummaryResponse"}}
                    }
                }
            }
        }
    }

    paths["/api/scout/daily-summary/pdf"] = {
        "get": {
            "tags": ["Scout & Organizer"],
            "summary": "Export Daily Organizer Summary PDF",
            "description": "Generates and streams an official, branded Catch Me Daily Summary PDF with KPI tiles, top performers, disciplinary log, goal events, match verification status, and head official certification.",
            "parameters": [
                {"name": "date", "in": "query", "schema": {"type": "string", "format": "date"}},
                {"name": "sport", "in": "query", "schema": {"type": "string"}},
                {"name": "tournamentId", "in": "query", "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "PDF binary stream",
                    "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}
                }
            }
        }
    }

    paths["/api/scout/daily-summary/csv"] = {
        "get": {
            "tags": ["Scout & Organizer"],
            "summary": "Export Daily Organizer Summary CSV",
            "description": "Generates and streams structured CSV summary sheets for spreadsheet analysis.",
            "parameters": [
                {"name": "date", "in": "query", "schema": {"type": "string", "format": "date"}},
                {"name": "sport", "in": "query", "schema": {"type": "string"}},
                {"name": "tournamentId", "in": "query", "schema": {"type": "string"}},
                {"name": "type", "in": "query", "schema": {"type": "string", "enum": ["all", "performers", "cards"]}, "description": "Specific sheet slice"}
            ],
            "responses": {
                "200": {
                    "description": "CSV text file stream",
                    "content": {"text/csv": {"schema": {"type": "string"}}}
                }
            }
        }
    }

    paths["/api/scout/profile/{id}/pdf"] = {
        "get": {
            "tags": ["Scout & Organizer", "Users"],
            "summary": "Export Athlete Scouting Dossier PDF",
            "description": "Generates a comprehensive, branded Athlete Scouting Report PDF containing player demographics, physical metrics (height/weight), level/XP, achievements, verified badge, performance stats, contact & verified social handles, and athlete profile QR code.",
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}, "description": "Athlete User ID"}
            ],
            "responses": {
                "200": {
                    "description": "PDF binary stream",
                    "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}
                },
                "404": {"description": "Athlete profile not found"}
            }
        }
    }

    # User PDF Endpoints
    paths["/api/users/{id}/download"] = {
        "get": {
            "tags": ["Users"],
            "summary": "Download Athlete Scouting Report PDF",
            "description": "Direct download stream for athlete scouting dossier PDF.",
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "PDF binary stream",
                    "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}
                },
                "404": {"description": "User not found"}
            }
        }
    }

    paths["/api/users/{id}/export"] = {
        "post": {
            "tags": ["Users"],
            "summary": "Generate User PDF Download Link",
            "description": "Returns a downloadable URL link for the athlete profile PDF.",
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "Download link",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "status": {"type": "string", "example": "SUCCESS"},
                                    "downloadUrl": {"type": "string", "example": "https://api.catchme.live/api/users/user123/download"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    # Game PDF Endpoints
    paths["/api/games/{id}/download"] = {
        "get": {
            "tags": ["Games"],
            "summary": "Download Official Match Verification & Game Sheet PDF",
            "description": "Generates a complete match sheet PDF featuring Catch Me branding, live game QR code, final scores, goals timeline, disciplinary cards (Yellow/Red), full team lineups & player box scores, and referee/scouter sign-off certification lines.",
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {
                    "description": "PDF binary stream",
                    "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}
                },
                "404": {"description": "Game not found"}
            }
        }
    }

    # Save to targets
    targets = [
        ("openapi.yaml", "openapi.json"),
        ("Catch Me Specifications.yaml", None),
    ]

    for y_file, j_file in targets:
        with open(y_file, "w", encoding="utf-8") as f:
            yaml.dump(spec, f, sort_keys=False, allow_unicode=True)
        print(f"Updated {y_file}")

        if j_file:
            with open(j_file, "w", encoding="utf-8") as f:
                json.dump(spec, f, indent=2, ensure_ascii=False)
            print(f"Updated {j_file}")

if __name__ == "__main__":
    update_openapi()
