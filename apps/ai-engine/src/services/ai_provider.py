"""
AI Provider — Multi-provider wrapper
=====================================
Gestiona la comunicación con Anthropic y OpenAI desde una interfaz unificada.

ESTRATEGIA DE USO (optimización de costos — Riesgo #2 del proyecto):
    - claude-sonnet-4-6  : análisis de patología, reportes, clasificaciones complejas
    - gpt-4o-mini        : respuestas conversacionales de WhatsApp/Instagram
                           (latencia < 1s, costo ~60% menor vs claude-sonnet-4-6)

PROMPT CACHING:
    Habilitado para el system prompt de clasificación en Anthropic.
    Ahorra ~90% del costo en tokens de sistema para llamadas repetidas.

FALLBACK AUTOMÁTICO:
    Si el provider primario falla, la llamada se reintenta en el secundario.
    El caller recibe el resultado sin saber qué provider respondió.
"""

import os
import time
from typing import Literal, Optional

import anthropic
from openai import AsyncOpenAI

Provider = Literal["anthropic", "openai"]


class AIProvider:
    """
    Wrapper unificado para Anthropic y OpenAI.

    Uso básico:
        result = await ai_provider.complete(
            prompt="...",
            system="...",
            provider="anthropic",
            model="claude-sonnet-4-6",
        )
        print(result["content"])
    """

    def __init__(self) -> None:
        self.anthropic_client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY"),
        )
        self.openai_client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
        )

    async def complete(
        self,
        prompt: str,
        system: str = "",
        provider: Provider = "anthropic",
        model: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.3,
        use_cache: bool = False,
    ) -> dict:
        """
        Interfaz unificada para todos los providers.

        Args:
            prompt      : Mensaje del usuario / contenido a procesar.
            system      : System prompt (instrucciones de comportamiento).
            provider    : "anthropic" | "openai"
            model       : Nombre del modelo. Defaults: claude-sonnet-4-6 / gpt-4o-mini.
            max_tokens  : Máximo de tokens en la respuesta.
            temperature : 0.0 = determinístico, 1.0 = creativo.
            use_cache   : Si True, marca el system prompt para prompt caching
                          (solo Anthropic — reduce costo en llamadas repetidas).

        Returns:
            {
                "content"     : str,   # Texto de la respuesta
                "model"       : str,   # Modelo que respondió
                "tokens_used" : int,   # Tokens totales consumidos
                "latency_ms"  : int,   # Latencia de la llamada en milisegundos
            }
        """
        start = time.time()

        try:
            if provider == "anthropic":
                resolved_model = model or "claude-sonnet-4-6"
                return await self._complete_anthropic(
                    prompt, system, resolved_model, max_tokens, temperature,
                    start, use_cache,
                )
            else:
                resolved_model = model or "gpt-4o-mini"
                return await self._complete_openai(
                    prompt, system, resolved_model, max_tokens, temperature, start,
                )

        except Exception as primary_error:
            # Fallback automático al provider alternativo
            fallback: Provider = "openai" if provider == "anthropic" else "anthropic"
            print(
                f"[ai_provider] {provider} failed: {primary_error!r}. "
                f"Falling back to {fallback}."
            )

            if fallback == "anthropic":
                return await self._complete_anthropic(
                    prompt, system, "claude-sonnet-4-6",
                    max_tokens, temperature, start, use_cache=False,
                )
            else:
                return await self._complete_openai(
                    prompt, system, "gpt-4o-mini",
                    max_tokens, temperature, start,
                )

    # -------------------------------------------------------------------------
    # Implementaciones por provider
    # -------------------------------------------------------------------------

    async def _complete_anthropic(
        self,
        prompt: str,
        system: str,
        model: str,
        max_tokens: int,
        temperature: float,
        start: float,
        use_cache: bool = False,
    ) -> dict:
        """
        Llamada a Anthropic Messages API.

        Cuando use_cache=True, el system prompt se envía con cache_control
        ephemeral para activar prompt caching. Esto reduce el costo de tokens
        de sistema en ~90% para llamadas repetidas con el mismo system prompt.
        """
        system_block: list | str

        if use_cache and system:
            # Formato de cache con cache_control para Anthropic
            system_block = [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            system_block = system

        response = self.anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_block,
            messages=[{"role": "user", "content": prompt}],
        )

        return {
            "content": response.content[0].text,
            "model": model,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "latency_ms": int((time.time() - start) * 1000),
        }

    async def _complete_openai(
        self,
        prompt: str,
        system: str,
        model: str,
        max_tokens: int,
        temperature: float,
        start: float,
    ) -> dict:
        """
        Llamada a OpenAI Chat Completions API.
        Usado principalmente para respuestas conversacionales de baja latencia.
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        return {
            "content": response.choices[0].message.content,
            "model": model,
            "tokens_used": response.usage.total_tokens,
            "latency_ms": int((time.time() - start) * 1000),
        }


# Singleton — compartido por todos los servicios que importen este módulo
ai_provider = AIProvider()
