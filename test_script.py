content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Dart vs Airship</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root {
            color-scheme: light dark;
        }
        body {
            margin: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: radial-gradient(circle at top, #e0f2ff 0%, #f1f5f9 55%, #dce2f0 100%);
            color: #0f172a;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .dart-wrapper {
            width: min(640px, 100%);
            background: rgba(255, 255, 255, 0.92);
            border-radius: 18px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
            padding: 28px;
            box-sizing: border-box;
        }
        h1 {
            margin: 0 0 0.35rem 0;
            font-size: clamp(1.8rem, 3vw, 2.2rem);
            text-align: center;
        }
        .subtitle {
            margin: 0 0 20px 0;
            text-align: center;
            color: #475569;
        }
        .playfield {
            position: relative;
            width: 100%;
            height: 240px;
            background: linear-gradient(180deg, rgba(148, 197, 255, 0.5) 0%, rgba(148, 197, 255, 0.02) 70%);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(15, 23, 42, 0.12);
        }
        .playfield::after {
            content: '';
            position: absolute;
            inset: auto 0 0 0;
            height: 54px;
            background: linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, rgba(148, 163, 184, 0.28) 100%);
        }
        .stone-display {
            position: absolute;
            top: 12px;
            left: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.75);
            color: #f8fafc;
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: none;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .stone-display.has-stones {
            opacity: 1;
            pointer-events: auto;
        }
        .stone-display.reward-active {
            background: #0f766e;
            transform: scale(1.05);
        }
        .stone-icon {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #e2e8f0 0%, #94a3b8 45%, #475569 100%);
            box-shadow: inset -1px -1px 3px rgba(15, 23, 42, 0.45);
        }
        .airship-link {
            position: absolute;
            top: 36px;
            left: 0;
            width: 110px;
            height: 55px;
            display: block;
            transform: translateX(0);
            pointer-events: none;
            text-decoration: none;
        }
        .airship-link.reward-active {
            pointer-events: auto;
            cursor: pointer;
        }
        .airship {
            width: 100%;
            height: 100%;
            background: url('resources/airship.jpg') center/cover no-repeat;
            border-radius: 999px;
            box-shadow: 0 12px 24px rgba(30, 64, 175, 0.35);
        }
        .dart {
            position: absolute;
            bottom: 10px;
            width: 26px;
            height: 90px;
            transform: translate(-50%, 0);
            transform-origin: center bottom;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }
        .dart-tip {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 20px solid #f97316;
        }
        .dart-body {
            width: 6px;
            height: 44px;
            background: linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%);
        }
        .dart-feather {
            width: 24px;
            height: 18px;
            background: linear-gradient(120deg, #facc15, #f97316);
            clip-path: polygon(0 0, 100% 40%, 100% 60%, 0 100%);
        }
        .controls {
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 18px;
        }
        .slider-row {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        input[type="range"],
        input[type="number"] {
            width: 100%;
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: inherit;
            box-sizing: border-box;
        }
        button {
            align-self: center;
            padding: 12px 26px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 999px;
            border: none;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #fff;
            cursor: pointer;
            box-shadow: 0 12px 24px rgba(37, 99, 235, 0.35);
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            box-shadow: none;
        }
        button:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 32px rgba(37, 99, 235, 0.45);
        }
        .control-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .status {
            text-align: center;
            font-size: 1.05rem;
            font-weight: 600;
            min-height: 1.2em;
        }
        .status[data-tone="win"] {
            color: #047857;
        }
        .status[data-tone="miss"] {
            color: #b91c1c;
        }
        .meta {
            text-align: center;
            font-size: 0.85rem;
            }'''
print(len(content))
