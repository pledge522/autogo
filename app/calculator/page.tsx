"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, History, Sigma, Calculator } from "lucide-react";

type Operator = "+" | "-" | "×" | "÷" | null;

type HistoryEntry = {
  expression: string;
  result: string;
};

const SCIENTIFIC_MODE = false;

const SCIENTIFIC_BUTTONS = [
  { label: "sin", action: "sin" },
  { label: "cos", action: "cos" },
  { label: "tan", action: "tan" },
  { label: "log", action: "log" },
  { label: "ln", action: "ln" },
  { label: "√", action: "sqrt" },
  { label: "x²", action: "square" },
  { label: "x³", action: "cube" },
  { label: "1/x", action: "reciprocal" },
  { label: "π", action: "pi" },
  { label: "e", action: "euler" },
  { label: "!", action: "factorial" },
];

export default function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showScientific, setShowScientific] = useState(false);
  const [memory, setMemory] = useState<number | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [display]);

  const inputDigit = useCallback(
    (digit: string) => {
      if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
      } else {
        setDisplay((prev) => (prev === "0" ? digit : prev + digit));
      }
    },
    [waitingForOperand]
  );

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay((prev) => prev + ".");
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression("");
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay("0");
  }, []);

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith("-"))) {
        return "0";
      }
      return prev.slice(0, -1);
    });
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0") return prev;
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  const percent = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const calculate = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : NaN;
      default: return b;
    }
  };

  const performOperation = useCallback(
    (nextOperator: Operator) => {
      const currentValue = parseFloat(display);

      if (prevValue === null) {
        setPrevValue(currentValue);
      } else if (operator) {
        const result = calculate(prevValue, currentValue, operator);
        setDisplay(String(result));
        setPrevValue(result);
      }

      setWaitingForOperand(true);
      setOperator(nextOperator);
      if (nextOperator) {
        setExpression(`${display} ${nextOperator}`);
      }
    },
    [display, prevValue, operator]
  );

  const equals = useCallback(() => {
    if (prevValue === null || operator === null) return;

    const currentValue = parseFloat(display);
    const result = calculate(prevValue, currentValue, operator);
    const expr = `${prevValue} ${operator} ${currentValue}`;

    const resultStr = isNaN(result) ? "Error" : String(result);

    setDisplay(resultStr);
    setExpression(`${expr} =`);
    setHistory((prev) => [{ expression: `${expr} =`, result: resultStr }, ...prev].slice(0, 20));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, prevValue, operator]);

  const applyUnary = useCallback(
    (fn: (x: number) => number, symbol: string) => {
      const value = parseFloat(display);
      const result = fn(value);
      const resultStr = isNaN(result) || !isFinite(result) ? "Error" : String(result);
      setExpression(`${symbol}(${display}) =`);
      setDisplay(resultStr);
      setHistory((prev) => [{ expression: `${symbol}(${display}) =`, result: resultStr }, ...prev].slice(0, 20));
      setWaitingForOperand(true);
    },
    [display]
  );

  const handleScientific = useCallback(
    (action: string) => {
      switch (action) {
        case "sin": applyUnary(Math.sin, "sin"); break;
        case "cos": applyUnary(Math.cos, "cos"); break;
        case "tan": applyUnary(Math.tan, "tan"); break;
        case "log": applyUnary(Math.log10, "log"); break;
        case "ln": applyUnary(Math.log, "ln"); break;
        case "sqrt": applyUnary(Math.sqrt, "√"); break;
        case "square": applyUnary((x) => x * x, "sq"); break;
        case "cube": applyUnary((x) => x * x * x, "cube"); break;
        case "reciprocal": applyUnary((x) => 1 / x, "1/"); break;
        case "pi": setDisplay(String(Math.PI)); setWaitingForOperand(true); break;
        case "euler": setDisplay(String(Math.E)); setWaitingForOperand(true); break;
        case "factorial": {
          const n = parseInt(display);
          if (n < 0 || n > 170 || isNaN(n)) {
            setDisplay("Error");
            return;
          }
          let r = 1;
          for (let i = 2; i <= n; i++) r *= i;
          setDisplay(String(r));
          setWaitingForOperand(true);
          break;
        }
      }
    },
    [applyUnary, display]
  );

  const memoryAction = useCallback(
    (action: "MC" | "MR" | "M+" | "M-") => {
      const current = parseFloat(display);
      switch (action) {
        case "MC": setMemory(null); break;
        case "MR": if (memory !== null) { setDisplay(String(memory)); setWaitingForOperand(true); } break;
        case "M+": setMemory((prev) => (prev ?? 0) + current); break;
        case "M-": setMemory((prev) => (prev ?? 0) - current); break;
      }
    },
    [display, memory]
  );

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setDisplay(entry.result);
    setShowHistory(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") { inputDigit(e.key); }
      else if (e.key === ".") { inputDecimal(); }
      else if (e.key === "+") { performOperation("+"); }
      else if (e.key === "-") { performOperation("-"); }
      else if (e.key === "*") { performOperation("×"); }
      else if (e.key === "/") { e.preventDefault(); performOperation("÷"); }
      else if (e.key === "Enter" || e.key === "=") { equals(); }
      else if (e.key === "Escape") { clear(); }
      else if (e.key === "Backspace") { backspace(); }
      else if (e.key === "%") { percent(); }
    },
    [inputDigit, inputDecimal, performOperation, equals, clear, backspace, percent]
  );

  const btnNum = "h-14 rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-90 select-none flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700";
  const btnOp = "h-14 rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-90 select-none flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-orange-200 dark:shadow-orange-900/30";
  const btnEq = "h-14 rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-90 select-none flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-300 dark:shadow-orange-900/40";
  const btnUtil = "h-14 rounded-2xl text-sm font-medium transition-all duration-150 active:scale-90 select-none flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600";
  const btnSci = "h-11 rounded-xl text-xs font-medium transition-all duration-150 active:scale-90 select-none flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600";

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScientific(!showScientific)}
              className={`p-2 rounded-xl transition-colors ${showScientific ? "bg-orange-100 dark:bg-orange-900/30 text-orange-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
              title="科学计算"
            >
              <Sigma size={18} />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-xl transition-colors ${showHistory ? "bg-orange-100 dark:bg-orange-900/30 text-orange-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
              title="历史记录"
            >
              <History size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-300 via-orange-500 to-orange-300" />

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-3 max-h-48 overflow-y-auto space-y-1 border-b border-gray-100 dark:border-gray-700 pb-3">
                  {history.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">暂无历史记录</p>
                  ) : (
                    history.map((entry, i) => (
                      <button
                        key={i}
                        onClick={() => handleHistorySelect(entry)}
                        className="w-full text-right px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="text-xs text-gray-400">{entry.expression}</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{entry.result}</div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scientific mode */}
          <AnimatePresence>
            {showScientific && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-6 gap-1.5 mb-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                  {SCIENTIFIC_BUTTONS.map((btn) => (
                    <button
                      key={btn.action}
                      className={btnSci}
                      onClick={() => handleScientific(btn.action)}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memory bar */}
          <div className="flex gap-1.5 mb-2">
            {["MC", "MR", "M+", "M-"].map((m) => (
              <button
                key={m}
                className="h-8 flex-1 rounded-lg text-[11px] font-medium transition-all duration-150 active:scale-90 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 disabled:opacity-30"
                onClick={() => memoryAction(m as "MC" | "MR" | "M+" | "M-")}
                disabled={m === "MR" && memory === null}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Expression */}
          <div className="text-right text-sm text-gray-400 dark:text-gray-500 h-6 overflow-hidden">
            {expression}
          </div>

          {/* Display */}
          <div className="text-right mb-4 overflow-hidden">
            <div
              ref={displayRef}
              className="text-4xl font-light text-gray-900 dark:text-white tracking-tight overflow-x-auto whitespace-nowrap scrollbar-hide"
            >
              {display}
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <button className={btnUtil} onClick={clear}>AC</button>
            <button className={btnUtil} onClick={backspace}>⌫</button>
            <button className={btnUtil} onClick={percent}>%</button>
            <button className={btnOp} onClick={() => performOperation("÷")}>÷</button>

            {/* Row 2 */}
            {["7", "8", "9"].map((n) => (
              <button key={n} className={btnNum} onClick={() => inputDigit(n)}>{n}</button>
            ))}
            <button className={btnOp} onClick={() => performOperation("×")}>×</button>

            {/* Row 3 */}
            {["4", "5", "6"].map((n) => (
              <button key={n} className={btnNum} onClick={() => inputDigit(n)}>{n}</button>
            ))}
            <button className={btnOp} onClick={() => performOperation("-")}>−</button>

            {/* Row 4 */}
            {["1", "2", "3"].map((n) => (
              <button key={n} className={btnNum} onClick={() => inputDigit(n)}>{n}</button>
            ))}
            <button className={btnOp} onClick={() => performOperation("+")}>+</button>

            {/* Row 5 */}
            <button className={`${btnNum} col-span-2`} onClick={() => inputDigit("0")}>0</button>
            <button className={btnNum} onClick={inputDecimal}>.</button>
            <button className={btnEq} onClick={equals}>=</button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-3">
          <span>键盘: 0-9 · + - * / · Enter · ⌫ · Esc</span>
        </p>
      </motion.div>
    </div>
  );
}
