package com.simpraworld.universe;

import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // 무한 캔버스는 전체화면이 기본. 상단 상태바 + 하단 3버튼(내비게이션) 바를 숨겨
  // 필기 공간을 최대로 쓰고, edge-to-edge 겹침(상태바와 툴바 충돌)을 없앤다.
  // sticky: 가장자리 스와이프하면 바가 잠깐 나왔다 다시 사라짐.
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideSystemBars();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    // 다른 앱 갔다 오거나 바가 잠깐 뜬 뒤 포커스 복귀 시 다시 숨김.
    if (hasFocus) hideSystemBars();
  }

  private void hideSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    WindowInsetsControllerCompat controller =
        new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
    controller.hide(WindowInsetsCompat.Type.systemBars());
    controller.setSystemBarsBehavior(
        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
  }
}
