#!/bin/bash

CMD="start"
USE_FORCE=false
USE_TEST=false
NETWORK_NAME="${NETWORK_NAME:-"traefik"}"
PROJECT_NAME="${PROJECT_NAME:-""}"

raiseError() {
    if [ -z "$2" ]; then
      echo "Error: $1 requires an argument"
    else
      echo "$2 $1"
    fi
    exit 1
}

logger() {
  local text="$1"
    local width=$(tput cols)
    local padding=$(( (width - ${#text}) /  2  ))
    local separator="="
    local bg_color=$(tput setab   2) # Green background
    local reset_color=$(tput sgr0) # Reset color

    printf '%*s\n' "$width" | tr ' ' $separator
    printf '%*s\n' "$padding" "${bg_color}${text}${reset_color}"
    printf '%*s\n' "$width" | tr ' ' $separator
}

extractEnvVariable() {
    CONTENTS=$(grep "$1=*" < .env)

    if [[ -z "$CONTENTS" ]]; then
        echo "/dev/null"
    else
        echo "$CONTENTS" | cut -d'=' -f2 | tr -d '[:space:]'
    fi
}

while [ $# -gt 0 ]; do
    case "${1}" in
        -f|--force)
            USE_FORCE=true
            shift
            ;;
        -n|--network)
            if [ -z "$2" ]; then
                raiseError "$1"
            fi
            NETWORK_NAME="$2"
            shift 2
            ;;
        -p|--project)
            if [ -z "$2" ]; then
                raiseError "$1"
            fi
            PROJECT_NAME="$2"
            shift 2
            ;;
        -t|--test)
            USE_TEST=true
            shift
            ;;
        *)
            if [[ "${1}" != -* ]] && [[ "${1}" != --* ]]; then
                CMD="$1"
                shift
            else
                raiseError "'${1}'" "Unknown option"
            fi
            ;;
    esac
done

SERVICES_CONFIG_FILE=$(extractEnvVariable "SERVICES_CONFIG_FILE")
SERVICES_EXPORTED_FILE=$(extractEnvVariable "SERVICES_EXPORTED_FILE")

#!/bin/bash

if ! test -f "$SERVICES_CONFIG_FILE"; then
  echo "No services Config file found. No user defined services will be generated."
  echo "The file will be written to $SERVICES_CONFIG_FILE"
  printf "\n"
  touch "$SERVICES_CONFIG_FILE"
fi

if [[ ! -f "$SERVICES_EXPORTED_FILE" ]] && [[ "$SERVICES_EXPORTED_FILE" != "/dev/null" ]]; then
  touch "$SERVICES_EXPORTED_FILE"
fi

if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="$NETWORK_NAME"
fi

if [ "$CMD" = "down" ] && [ -f "generated-compose-traefik.yml" ]; then
  docker-compose -f generated-compose-traefik.yml -p "$PROJECT_NAME" down &> /dev/null
  docker-compose -f generated-compose-test.yml -p "$PROJECT_NAME" down &> /dev/null
  echo "Stopped all Traefik services"
else
  if [ "$CMD" = "down" ]; then
    echo "Generated docker compose file not found. Starting normally"
  fi

  logger "Starting generation"
  export SERVICES_CONFIG_FILE="$SERVICES_CONFIG_FILE"
  export SERVICES_EXPORTED_FILE="$SERVICES_EXPORTED_FILE"

  envsubst < compose-generator.template.yml > generated-compose-generator.yml
  docker-compose -f generated-compose-generator.yml -p "$PROJECT_NAME" up --build
  docker-compose -f generated-compose-generator.yml -p "$PROJECT_NAME" down &> /dev/null

  unset SERVICES_CONFIG_FILE
  unset SERVICES_EXPORTED_FILE

  if [ "$CMD" != "generate" ]; then
      if [ "$USE_FORCE" == true ]; then
          TRAEFIK_STATUS=""
          shift 1
      else
          TRAEFIK_STATUS=$(docker ps --format '{{.Names}}' | grep "traefik")
      fi

      if [ $USE_TEST == true ]; then
        echo "Building test container"
        sed "s/\${NETWORK_NAME}/$NETWORK_NAME/g" compose-test.template.yml > generated-compose-test.yml
        docker-compose -f generated-compose-test.yml -p "$PROJECT_NAME" up -d --build
      else
        if [ -f "generated-compose-test.yml" ]; then
          docker-compose -f generated-compose-test.yml -p "$PROJECT_NAME" down --build
          rm -f generated-compose-test.yml
        fi
      fi

      if [[ -n "$TRAEFIK_STATUS" ]]; then
         logger "Nothing to do. Traefik already running. Use with '-f' or '--force' to rebuild"
      else
          if ! docker network inspect "$NETWORK_NAME" >> /dev/null; then
              logger "Creating non-existent network $NETWORK_NAME"
              docker network create "$NETWORK_NAME"
          fi

          logger "Generating compose file"
          sed "s/\${NETWORK_NAME}/$NETWORK_NAME/g" compose-traefik.template.yml > generated-compose-traefik.yml

          logger "Running compose file"
          docker-compose -f generated-compose-traefik.yml -p "$PROJECT_NAME" up -d --build
      fi
      else
        logger "generation done"
    fi
fi