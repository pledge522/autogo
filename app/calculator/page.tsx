"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Operator = "+" | "-" | "×" | "÷" | null;

export default function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState("");

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

  const calculate = (
    a: number,
    b: number,
    op: Operator
  ): number => {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b !== 0 ? a / b : NaN;
      default:
        return b;
    }
  };

  const equals = useCallback(() => {
    if (prevValue === null || operator === null) return;

    const currentValue = parseFloat(display);
    const result = calculate(prevValue, currentValue, operator);
    const expr = `${prevValue} ${operator} ${currentValue} =`;

    setDisplay(isNaN(result) ? "Error" : String(result));
    setExpression(expr);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, prevValue, operator]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        inputDigit(e.key);
      } else if (e.key === ".") {
        inputDecimal();
      } else if (e.key === "+") {
        performOperation("+");
      } else if (e.key === "-") {
        performOperation("-");
      } else if (e.key === "*") {
        performOperation("×");
      } else if (e.key === "/") {
        e.preventDefault();
        performOperation("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        equals();
      } else if (e.key === "Escape") {
        clear();
      } else if (e.key === "%") {
        percent();
      }
    },
    [inputDigit, inputDecimal, performOperation, equals, clear, percent]
  );

  const btnClass =
    "rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-95 select-none flex items-center justify-center";

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* 导航返回 */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={16} />
            返回首页
          </Link>
        </div>

        {/* 计算器主体 */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-5">
          {/* 表达式 */}
          <div className="text-right text-sm text-gray-400 dark:text-gray-500 h-6 overflow-hidden">
            {expression}
          </div>

          {/* 显示 */}
          <div className="text-right mb-5 overflow-hidden">
            <span className="text-4xl font-light text-gray-900 dark:text-white tracking-tight">
              {display}
            </span>
          </div>

          {/* 按钮网格 */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* 第一行 */}
            <button
              className={`${btnClass} h-16 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600`}
              onClick={clear}
            >
              C
            </button>
            <button
              className={`${btnClass} h-16 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600`}
              onClick={toggleSign}
            >
              ±
            </button>
            <button
              className={`${btnClass} h-16 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600`}
              onClick={percent}
            >
              %
            </button>
            <button
              className={`${btnClass} h-16 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700`}
              onClick={() => performOperation("÷")}
            >
              ÷
            </button>

            {/* 第二行 */}
            {["7", "8", "9"].map((n) => (
              <button
                key={n}
                className={`${btnClass} h-16               bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700`}
                onClick={() => inputDigit(n)}
              >
                {n}
              </button>
            ))}
            <button
              className={`${btnClass} h-16 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700`}
              onClick={() => performOperation("×")}
            >
              ×
            </button>

            {/* 第三行 */}
            {["4", "5", "6"].map((n) => (
              <button
                key={n}
                className={`${btnClass} h-16               bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700`}
                onClick={() => inputDigit(n)}
              >
                {n}
              </button>
            ))}
            <button
              className={`${btnClass} h-16 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700`}
              onClick={() => performOperation("-")}
            >
              -
            </button>

            {/* 第四行 */}
            {["1", "2", "3"].map((n) => (
              <button
                key={n}
                className={`${btnClass} h-16               bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700`}
                onClick={() => inputDigit(n)}
              >
                {n}
              </button>
            ))}
            <button
              className={`${btnClass} h-16 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700`}
              onClick={() => performOperation("+")}
            >
              +
            </button>

            {/* 第五行 */}
            <button
              className={`${btnClass} h-16 col-span-2               bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700`}
              onClick={() => inputDigit("0")}
            >
              0
            </button>
            <button
              className={`${btnClass} h-16               bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700`}
              onClick={inputDecimal}
            >
              .
            </button>
            <button
              className={`${btnClass} h-16 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-2xl`}
              onClick={equals}
            >
              =
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          支持键盘输入：数字 0-9 、运算符（+ - * /）、Enter = 、Esc 清空
        </p>
      </motion.div>
    </div>
  );
}
