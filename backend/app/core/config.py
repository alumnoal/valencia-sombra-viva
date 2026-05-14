from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    valencia_api_key: str = ""
    heat_alert_threshold: float = 35.0

    # Coordenadas de Valencia (centro)
    valencia_lat: float = 39.4699
    valencia_lon: float = -0.3763

    # Ruta raíz de los datos geoespaciales (vacío = autodetectar relativo al código)
    data_dir: str = ""
    # Orígenes CORS permitidos separados por coma; "*" permite todos
    allowed_origins: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
