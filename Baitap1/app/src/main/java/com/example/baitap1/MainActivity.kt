package com.example.baitap1

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.baitap1.ui.theme.Baitap1Theme // Đảm bảo import đúng theme của bạn

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            Baitap1Theme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    // Gọi hàm giao diện chính của chúng ta
                    MyGridScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

@Composable
fun MyGridScreen(modifier: Modifier = Modifier) {
    // Cột dọc chính chứa toàn bộ giao diện
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(8.dp) // Viền trắng xung quanh
    ) {
        // --- HÀNG 1 ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f) // Chiếm 1 phần chiều cao
                .padding(bottom = 4.dp)
        ) {
            ColorBox(number = "1", bgColor = Color(0xFF2196F3), modifier = Modifier.weight(1f).padding(end = 4.dp))
            ColorBox(number = "2", bgColor = Color(0xFFF44336), modifier = Modifier.weight(1f).padding(start = 4.dp))
        }

        // --- HÀNG 2 ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f) // Chiếm 1 phần chiều cao
                .padding(bottom = 4.dp)
        ) {
            ColorBox(number = "3", bgColor = Color(0xFFFFEB3B), textColor = Color.Black, modifier = Modifier.weight(1f).padding(end = 4.dp))
            ColorBox(number = "4", bgColor = Color(0xFF4CAF50), modifier = Modifier.weight(1f).padding(horizontal = 4.dp))
            // Ô số 5 có weight = 2 để rộng gấp đôi
            ColorBox(number = "5", bgColor = Color(0xFF9C27B0), modifier = Modifier.weight(2f).padding(start = 4.dp))
        }

        // --- HÀNG 3 ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f) // Chiếm 1 phần chiều cao
                .padding(bottom = 24.dp)
        ) {
            ColorBox(number = "6", bgColor = Color(0xFFFF9800), modifier = Modifier.fillMaxWidth())
        }

        // --- PHẦN FOOTER (Họ và tên - MSSV) ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(2f), // Chiếm 2 phần chiều cao còn lại (để đẩy chữ xuống dưới)
            contentAlignment = Alignment.BottomCenter
        ) {
            Text(
                text = "Bùi Trần Minh Anh - BIT240013",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black,
                modifier = Modifier.padding(bottom = 32.dp)
            )
        }
    }
}

// Hàm phụ trợ để tạo các ô màu có chữ số ở giữa, giúp code gọn hơn
@Composable
fun ColorBox(
    number: String,
    bgColor: Color,
    modifier: Modifier = Modifier,
    textColor: Color = Color.White
) {
    Box(
        modifier = modifier
            .fillMaxHeight()
            .background(color = bgColor, shape = RoundedCornerShape(2.dp)), // Bo góc nhẹ cho đẹp
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = number,
            color = textColor,
            fontSize = 50.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Preview(showBackground = true)
@Composable
fun MyGridScreenPreview() {
    Baitap1Theme {
        MyGridScreen()
    }
}