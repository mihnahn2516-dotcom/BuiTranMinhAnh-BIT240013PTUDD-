package com.example.baitap2

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.baitap2.ui.theme.Baitap2Theme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            Baitap2Theme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    MyGridScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

@Composable
fun MyGridScreen(modifier: Modifier = Modifier) {
    val gap = 4.dp

    Column(modifier = modifier.fillMaxSize()) {

        // --- Ô SỐ 1 (Xanh dương) ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .padding(horizontal = gap, vertical = gap / 2)
                .background(Color(0xFF2196F3)),
            contentAlignment = Alignment.Center
        ) {
            Text("1", color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        }

        // --- Ô SỐ 2 (Đỏ) ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .padding(horizontal = gap, vertical = gap / 2)
                .background(Color(0xFFF44336)),
            contentAlignment = Alignment.Center
        ) {
            Text("2", color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        }

        // --- HÀNG 3-4-5 ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(110.dp)
                .padding(horizontal = gap, vertical = gap / 2)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(end = gap / 2)
                    .background(Color(0xFFFFEB3B)),
                contentAlignment = Alignment.Center
            ) {
                Text("3", color = Color.Black, fontSize = 40.sp, fontWeight = FontWeight.Bold)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(horizontal = gap / 2)
                    .background(Color(0xFF4CAF50)),
                contentAlignment = Alignment.Center
            ) {
                Text("4", color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(start = gap / 2)
                    .background(Color(0xFF9C27B0)),
                contentAlignment = Alignment.Center
            ) {
                Text("5", color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.weight(1f))
        }

        // --- Ô SỐ 6 (Cam) ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .padding(horizontal = gap, vertical = gap / 2)
                .background(Color(0xFFFF9800)),
            contentAlignment = Alignment.Center
        ) {
            Text("6", color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.weight(1f))

        Text(
            text = "Bùi Trần Minh Anh - BIT240013",
            fontSize = 16.sp,
            color = Color.Black,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 30.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
fun MyGridScreenPreview() {
    Baitap2Theme {
        MyGridScreen()
    }
}