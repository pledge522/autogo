import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSession,
  destroySession,
} from "@/lib/sandbox/manager";

export const dynamic = "force-dynamic";

/** POST /api/session — 创建新会话 */
export async function POST() {
  try {
    const session = await createSession();
    return NextResponse.json({
      id: session.id,
      port: session.port,
      projectDir: session.projectDir,
    });
  } catch (err: unknown) {
    const error = err as { message: string };
    return NextResponse.json(
      { error: `创建会话失败: ${error.message}` },
      { status: 500 }
    );
  }
}

/** GET /api/session?id=xxx — 查询会话 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    port: session.port,
    projectDir: session.projectDir,
    createdAt: session.createdAt,
  });
}

/** DELETE /api/session?id=xxx — 销毁会话 */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const destroyed = await destroySession(id);
  if (!destroyed) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
